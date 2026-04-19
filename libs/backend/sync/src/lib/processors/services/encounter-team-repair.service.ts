import { TournamentApiClient, TeamMatch } from '@app/backend-tournament-api';
import { CompetitionEncounter, CompetitionEvent as CompetitionEventModel } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { Not, IsNull } from 'typeorm';
import { TeamMatchingService } from './team-matching.service';

export interface EncounterTeamRepairOptions {
  /** When true, only logs what would change without saving. */
  dryRun?: boolean;
  /** Optional hard cap on number of encounters to process. */
  limit?: number;
  /** Only repair encounters whose current home/away team name matches this (ILIKE). */
  currentTeamNameLike?: string;
}

export interface EncounterTeamRepairResult {
  scanned: number;
  inspected: number;
  changed: number;
  skippedNoApiMatch: number;
  skippedNoTeamMatch: number;
  failed: number;
}

/**
 * One-off repair service that re-evaluates the home/away team links on
 * CompetitionEncounters using the current TeamMatchingService against the
 * original toernooi.nl API data for each encounter's draw.
 *
 * Motivation: earlier matching logic could incorrectly link a team whose API
 * name was a prefix of another club (e.g. "Smash 1H" → "Smash For Fun 1H").
 * This service walks every encounter, re-matches via the fixed matcher, and
 * updates homeTeamId/awayTeamId when the matcher now picks a different team.
 *
 * Games / ranking points are intentionally left untouched — only the
 * encounter-level team links are corrected here.
 */
@Injectable()
export class EncounterTeamRepairService {
  private readonly logger = new Logger(EncounterTeamRepairService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly teamMatchingService: TeamMatchingService,
  ) {}

  async repairCompetitionEncounterTeams(options: EncounterTeamRepairOptions = {}): Promise<EncounterTeamRepairResult> {
    const { dryRun = false, limit, currentTeamNameLike } = options;

    this.logger.log(
      `Starting encounter team-link repair (dryRun=${dryRun}${limit ? `, limit=${limit}` : ''}${
        currentTeamNameLike ? `, currentTeamNameLike="${currentTeamNameLike}"` : ''
      })`,
    );

    // Load encounters grouped per draw so we make exactly one API call per
    // draw (getEncountersByDraw returns all team matches at once).
    const encounters = await CompetitionEncounter.find({
      where: {
        visualCode: Not(IsNull()),
      },
      relations: [
        'homeTeam',
        'awayTeam',
        'drawCompetition',
        'drawCompetition.competitionSubEvent',
        'drawCompetition.competitionSubEvent.competitionEvent',
      ],
      order: { drawId: 'ASC' },
    });

    const result: EncounterTeamRepairResult = {
      scanned: encounters.length,
      inspected: 0,
      changed: 0,
      skippedNoApiMatch: 0,
      skippedNoTeamMatch: 0,
      failed: 0,
    };

    // Group by draw to minimize API traffic.
    const byDraw = new Map<string, CompetitionEncounter[]>();
    for (const enc of encounters) {
      const key = enc.drawId ?? '';
      if (!key) continue;
      const list = byDraw.get(key) ?? [];
      list.push(enc);
      byDraw.set(key, list);
    }

    let processedCount = 0;

    for (const [drawId, drawEncounters] of byDraw) {
      if (limit !== undefined && processedCount >= limit) break;

      const sample = drawEncounters[0];
      const draw = sample.drawCompetition;
      const event = draw?.competitionSubEvent?.competitionEvent ?? null;
      const tournamentCode = event?.visualCode;
      const drawCode = draw?.visualCode;

      if (!tournamentCode || !drawCode) {
        this.logger.warn(`Draw ${drawId} missing tournament/draw visualCode — skipping ${drawEncounters.length} encounter(s)`);
        result.failed += drawEncounters.length;
        continue;
      }

      let teamMatches: TeamMatch[];
      try {
        teamMatches = await this.tournamentApiClient.getEncountersByDraw(tournamentCode, drawCode);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to fetch encounters for tournament=${tournamentCode} draw=${drawCode}: ${message}`);
        result.failed += drawEncounters.length;
        continue;
      }

      const byCode = new Map<string, TeamMatch>();
      for (const tm of teamMatches) {
        if (tm?.Code) byCode.set(tm.Code, tm);
      }

      for (const encounter of drawEncounters) {
        if (limit !== undefined && processedCount >= limit) break;
        processedCount++;
        result.inspected++;

        try {
          const changed = await this.repairSingleEncounter(encounter, event, byCode, currentTeamNameLike, dryRun);
          if (changed === 'changed') result.changed++;
          else if (changed === 'no-api-match') result.skippedNoApiMatch++;
          else if (changed === 'no-team-match') result.skippedNoTeamMatch++;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Failed to repair encounter ${encounter.id} (${encounter.visualCode}): ${message}`);
          result.failed++;
        }
      }
    }

    this.logger.log(
      `Encounter team-link repair complete: scanned=${result.scanned}, inspected=${result.inspected}, changed=${result.changed}, ` +
        `skippedNoApiMatch=${result.skippedNoApiMatch}, skippedNoTeamMatch=${result.skippedNoTeamMatch}, failed=${result.failed}`,
    );
    return result;
  }

  private async repairSingleEncounter(
    encounter: CompetitionEncounter,
    competitionEvent: CompetitionEventModel | null,
    byCode: Map<string, TeamMatch>,
    currentTeamNameLike: string | undefined,
    dryRun: boolean,
  ): Promise<'changed' | 'unchanged' | 'no-api-match' | 'no-team-match'> {
    const code = encounter.visualCode;
    if (!code) return 'no-api-match';

    // Optional filter: only repair encounters where the *current* home/away
    // team name matches a pattern (e.g. "Smash For Fun%").
    if (currentTeamNameLike) {
      const needle = currentTeamNameLike.toLowerCase();
      const homeName = encounter.homeTeam?.name?.toLowerCase() ?? '';
      const awayName = encounter.awayTeam?.name?.toLowerCase() ?? '';
      if (!homeName.includes(needle) && !awayName.includes(needle)) {
        return 'unchanged';
      }
    }

    const teamMatch = byCode.get(code);
    if (!teamMatch) return 'no-api-match';

    let newHomeId: string | undefined = encounter.homeTeamId;
    let newAwayId: string | undefined = encounter.awayTeamId;
    let anyMatchFound = false;

    if (teamMatch.Team1) {
      const homeResult = await this.teamMatchingService.findTeam(teamMatch.Team1.Code, teamMatch.Team1.Name, competitionEvent);
      if (homeResult.team) {
        newHomeId = homeResult.team.id;
        anyMatchFound = true;
      }
    }
    if (teamMatch.Team2) {
      const awayResult = await this.teamMatchingService.findTeam(teamMatch.Team2.Code, teamMatch.Team2.Name, competitionEvent);
      if (awayResult.team) {
        newAwayId = awayResult.team.id;
        anyMatchFound = true;
      }
    }

    if (!anyMatchFound) return 'no-team-match';

    const homeChanged = newHomeId !== encounter.homeTeamId;
    const awayChanged = newAwayId !== encounter.awayTeamId;

    if (!homeChanged && !awayChanged) return 'unchanged';

    const beforeHome = encounter.homeTeam?.name ?? encounter.homeTeamId ?? '∅';
    const beforeAway = encounter.awayTeam?.name ?? encounter.awayTeamId ?? '∅';
    // Season is essential context: a club's "X 1H" team name exists once per
    // season, so log it on every repair line to make the intent unambiguous.
    const season = competitionEvent?.season ?? encounter.homeTeam?.season ?? encounter.awayTeam?.season ?? 'unknown';
    this.logger.log(
      `Repairing encounter ${encounter.id} (${code}) [season=${season}]: ` +
        (homeChanged ? `home "${beforeHome}" (${encounter.homeTeamId ?? '∅'}) -> ${newHomeId ?? '∅'} ` : '') +
        (awayChanged ? `away "${beforeAway}" (${encounter.awayTeamId ?? '∅'}) -> ${newAwayId ?? '∅'}` : '') +
        (dryRun ? ' [DRY RUN]' : ''),
    );

    if (!dryRun) {
      encounter.homeTeamId = newHomeId;
      encounter.awayTeamId = newAwayId;
      await encounter.save();
    }

    return 'changed';
  }
}
