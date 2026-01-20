import { TournamentApiClient, TeamMatch, Match, Player as TournamentPlayer } from '@app/backend-tournament-api';
import { CompetitionDraw, CompetitionEncounter, Team as TeamModel, Game, Player } from '@app/models';
import { GameStatus, GameType } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { CompetitionPlanningService, CompetitionWorkPlan } from './competition-planning.service';
import { TeamMatchingService } from './team-matching.service';

export interface CompetitionEncounterSyncData {
  tournamentCode: string;
  eventCode?: string;
  drawCode: string;
  encounterCodes?: string[];
  includeSubComponents?: boolean;
  workPlan?: CompetitionWorkPlan;
  childJobsCreated?: boolean;
}

@Injectable()
export class CompetitionEncounterSyncService {
  private readonly logger = new Logger(CompetitionEncounterSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly competitionPlanningService: CompetitionPlanningService,
    private readonly teamMatchingService: TeamMatchingService,
    @InjectFlowProducer(COMPETITION_EVENT_QUEUE) private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processEncounterSync(
    job: Job<CompetitionEncounterSyncData>,
    updateProgress: (progress: number) => Promise<void>,
    token: string
  ): Promise<void> {
    this.logger.log(`Processing competition encounter sync`);
    const { tournamentCode, eventCode, drawCode, encounterCodes, includeSubComponents, childJobsCreated } = job.data;

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // encounter sync + (optional child job creation)

      // Always create/update encounters first (primary responsibility of Encounter service)
      await this.createOrUpdateEncounters(tournamentCode, drawCode, encounterCodes);

      completedSteps++;
      await updateProgress(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.debug(`Completed encounter creation/update`);

      // If includeSubComponents and child jobs haven't been created yet, add standing sync job
      // Note: Games are already processed during encounter sync (via getTeamMatchGames)
      if (includeSubComponents && !childJobsCreated) {
        const standingJobName = generateJobId('competition', 'standing', tournamentCode, drawCode);

        const children = [
          {
            name: standingJobName,
            queueName: COMPETITION_EVENT_QUEUE,
            data: {
              tournamentCode,
              eventCode,
              drawCode,
              metadata: {
                displayName: `Standing Sync: ${drawCode}`,
                description: `Standing synchronization for draw ${drawCode} in competition ${tournamentCode}`,
              },
            },
            opts: {
              jobId: standingJobName,
              parent: {
                id: job.id!,
                queue: job.queueQualifiedName,
              },
            },
          },
        ];

        await job.updateData({
          ...job.data,
          childJobsCreated: true,
        });

        await this.competitionSyncFlow.addBulk(children);

        this.logger.log(`Added standing job for encounter sync`);

        // Move to waiting for children and throw WaitingChildrenError
        const shouldWait = await job.moveToWaitingChildren(token);
        if (shouldWait) {
          this.logger.log(`Moving to waiting for children - standing job pending`);
          throw new WaitingChildrenError();
        }

        // If we reach here, all children have completed
        this.logger.log(`All child jobs completed, continuing`);
      }

      completedSteps++;
      const finalProgress = this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
      await updateProgress(finalProgress);

      this.logger.log(`Completed competition encounter sync`);
    } catch (error: unknown) {
      // Re-throw WaitingChildrenError as expected
      if (error instanceof WaitingChildrenError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition encounter sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  private async createOrUpdateEncounters(tournamentCode: string, drawCode: string, encounterCodes?: string[]): Promise<void> {
    this.logger.log(`Creating/updating encounters for competition ${tournamentCode}, draw ${drawCode}`);

    try {
      // Fetch all team matches (encounters) in the draw
      const drawTeamMatches = await this.tournamentApiClient.getEncountersByDraw(tournamentCode, drawCode);
      let teamMatches: TeamMatch[] = drawTeamMatches?.filter((match) => match != null) || [];

      // Filter to specific encounters if codes are provided
      if (encounterCodes && encounterCodes.length > 0) {
        const encounterCodeSet = new Set(encounterCodes);
        teamMatches = teamMatches.filter((match) => encounterCodeSet.has(match.Code));
        this.logger.debug(`Filtered to ${teamMatches.length} specific encounters from ${drawTeamMatches?.length || 0} total`);
      }

      this.logger.log(`Found ${teamMatches.length} team matches to process`);

      // Process team matches
      for (const teamMatch of teamMatches) {
        if (!teamMatch) {
          this.logger.warn(`Skipping undefined team match`);
          continue;
        }

        await this.createOrUpdateEncounter(tournamentCode, teamMatch);
      }

      this.logger.log(`Created/updated ${teamMatches.length} encounters`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create/update encounters: ${errorMessage}`, error);
      throw error;
    }
  }

  private async createOrUpdateEncounter(tournamentCode: string, teamMatch: TeamMatch): Promise<void> {
    this.logger.debug(`Processing encounter: ${teamMatch.Code}`);

    // Find the draw this encounter belongs to with competition context
    const draw = await CompetitionDraw.findOne({
      where: {
        visualCode: teamMatch.DrawCode,
        competitionSubEvent: {
          competitionEvent: {
            visualCode: tournamentCode,
          },
        },
      },
      relations: ['competitionSubEvent', 'competitionSubEvent.competitionEvent'],
    });

    if (!draw) {
      this.logger.warn(`Competition draw with code ${teamMatch.DrawCode} not found, skipping encounter ${teamMatch.Code}`);
      return;
    }

    // Get competition event for team matching context
    const competitionEvent = draw.competitionSubEvent?.competitionEvent || null;

    // Find teams using flexible matching (Team1 = Home, Team2 = Away)
    let homeTeam: TeamModel | null = null;
    let awayTeam: TeamModel | null = null;

    if (teamMatch.Team1) {
      const result = await this.teamMatchingService.findTeam(teamMatch.Team1.Code, teamMatch.Team1.Name, competitionEvent);
      homeTeam = result.team;
      if (result.team) {
        this.logger.debug(`Home team matched: "${teamMatch.Team1.Name}" -> "${result.team.name}" (${result.confidence})`);
      }
    }
    if (teamMatch.Team2) {
      const result = await this.teamMatchingService.findTeam(teamMatch.Team2.Code, teamMatch.Team2.Name, competitionEvent);
      awayTeam = result.team;
      if (result.team) {
        this.logger.debug(`Away team matched: "${teamMatch.Team2.Name}" -> "${result.team.name}" (${result.confidence})`);
      }
    }

    // Calculate scores from Sets if available (sum of set scores)
    let homeScore: number | undefined;
    let awayScore: number | undefined;
    if (teamMatch.Sets?.Set && teamMatch.Sets.Set.length > 0) {
      homeScore = teamMatch.Sets.Set.reduce((sum, set) => sum + (set.Team1 || 0), 0);
      awayScore = teamMatch.Sets.Set.reduce((sum, set) => sum + (set.Team2 || 0), 0);
    }

    const existingEncounter = await CompetitionEncounter.findOne({
      where: {
        visualCode: teamMatch.Code,
        drawCompetition: {
          competitionSubEvent: {
            competitionEvent: {
              visualCode: tournamentCode,
            },
          },
        },
      },
      relations: ['drawCompetition', 'drawCompetition.competitionSubEvent', 'drawCompetition.competitionSubEvent.competitionEvent'],
    });

    let encounter: CompetitionEncounter;
    if (existingEncounter) {
      existingEncounter.date = teamMatch.MatchTime ? new Date(teamMatch.MatchTime) : undefined;
      existingEncounter.drawId = draw.id;
      existingEncounter.homeTeamId = homeTeam?.id;
      existingEncounter.awayTeamId = awayTeam?.id;
      existingEncounter.homeScore = homeScore;
      existingEncounter.awayScore = awayScore;
      await existingEncounter.save();
      encounter = existingEncounter;
    } else {
      const newEncounter = new CompetitionEncounter();
      newEncounter.visualCode = teamMatch.Code;
      newEncounter.date = teamMatch.MatchTime ? new Date(teamMatch.MatchTime) : undefined;
      newEncounter.drawId = draw.id;
      newEncounter.homeTeamId = homeTeam?.id;
      newEncounter.awayTeamId = awayTeam?.id;
      newEncounter.homeScore = homeScore;
      newEncounter.awayScore = awayScore;
      await newEncounter.save();
      encounter = newEncounter;
    }

    // Fetch and process all individual games within this encounter
    // This is more efficient than separate game sync (1 API call instead of 8)
    await this.syncGamesForEncounter(tournamentCode, teamMatch.Code, encounter.id);
  }

  /**
   * Fetch all individual games within an encounter and sync them
   */
  private async syncGamesForEncounter(tournamentCode: string, encounterCode: string, encounterId: string): Promise<void> {
    try {
      const games = await this.tournamentApiClient.getTeamMatchGames(tournamentCode, encounterCode);
      this.logger.debug(`Found ${games.length} games for encounter ${encounterCode}`);

      for (const game of games) {
        if (!game) continue;
        await this.processGame(game, encounterId);
      }

      this.logger.debug(`Processed ${games.length} games for encounter ${encounterCode}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to sync games for encounter ${encounterCode}: ${errorMessage}`);
      // Don't throw - we still want the encounter to be saved even if games fail
    }
  }

  /**
   * Process an individual game (match) within an encounter
   */
  private async processGame(match: Match, encounterId: string): Promise<void> {
    this.logger.debug(`Processing game: ${match.Code}`);

    // Check if game already exists - use linkId (encounterId) to ensure we find the correct game
    // since visualCode is not unique across encounters (it's just 1, 2, 3, etc.)
    const existingGame = await Game.findOne({
      where: { visualCode: match.Code, linkId: encounterId, linkType: 'competition' },
    });

    if (existingGame) {
      existingGame.playedAt = match.MatchTime ? new Date(match.MatchTime) : undefined;
      existingGame.gameType = this.mapGameType(match);
      existingGame.status = this.mapMatchStatus(match.ScoreStatus?.toString());
      existingGame.winner = match.Winner;
      existingGame.round = match.RoundName;
      existingGame.linkId = encounterId;
      existingGame.set1Team1 = match.Sets?.Set?.[0]?.Team1;
      existingGame.set1Team2 = match.Sets?.Set?.[0]?.Team2;
      existingGame.set2Team1 = match.Sets?.Set?.[1]?.Team1;
      existingGame.set2Team2 = match.Sets?.Set?.[1]?.Team2;
      existingGame.set3Team1 = match.Sets?.Set?.[2]?.Team1;
      existingGame.set3Team2 = match.Sets?.Set?.[2]?.Team2;
      await existingGame.save();
    } else {
      const newGame = new Game();
      newGame.visualCode = match.Code;
      newGame.playedAt = match.MatchTime ? new Date(match.MatchTime) : undefined;
      newGame.gameType = this.mapGameType(match);
      newGame.status = this.mapMatchStatus(match.ScoreStatus?.toString());
      newGame.winner = match.Winner;
      newGame.round = match.RoundName;
      newGame.linkType = 'competition';
      newGame.linkId = encounterId;
      newGame.set1Team1 = match.Sets?.Set?.[0]?.Team1;
      newGame.set1Team2 = match.Sets?.Set?.[0]?.Team2;
      newGame.set2Team1 = match.Sets?.Set?.[1]?.Team1;
      newGame.set2Team2 = match.Sets?.Set?.[1]?.Team2;
      newGame.set3Team1 = match.Sets?.Set?.[2]?.Team1;
      newGame.set3Team2 = match.Sets?.Set?.[2]?.Team2;
      await newGame.save();
    }

    // Ensure players exist in our system
    if (match.Team1?.Player1) {
      await this.createOrUpdatePlayer(match.Team1.Player1);
    }
    if (match.Team1?.Player2) {
      await this.createOrUpdatePlayer(match.Team1.Player2);
    }
    if (match.Team2?.Player1) {
      await this.createOrUpdatePlayer(match.Team2.Player1);
    }
    if (match.Team2?.Player2) {
      await this.createOrUpdatePlayer(match.Team2.Player2);
    }
  }

  /**
   * Map match to game type based on MatchTypeID
   * MatchTypeID: 1 = Singles, 3 = Doubles
   */
  private mapGameType(match: Match & { MatchTypeID?: number }): GameType {
    const matchTypeId = (match as { MatchTypeID?: number }).MatchTypeID;
    if (matchTypeId === 1) return GameType.S;
    if (matchTypeId === 3) return GameType.D;
    // Fallback to checking event name
    if (match.EventName?.toLowerCase().includes('single')) return GameType.S;
    if (match.EventName?.toLowerCase().includes('double')) return GameType.D;
    if (match.EventName?.toLowerCase().includes('mixed')) return GameType.MX;
    return GameType.S; // Default to singles
  }

  private mapMatchStatus(scoreStatus?: string): GameStatus {
    switch (scoreStatus?.toLowerCase()) {
      case 'played':
      case '0': // ScoreStatus 0 typically means played
        return GameStatus.NORMAL;
      case 'scheduled':
        return GameStatus.NORMAL;
      case 'postponed':
        return GameStatus.NORMAL;
      case 'cancelled':
        return GameStatus.NO_MATCH;
      default:
        return GameStatus.NORMAL;
    }
  }

  private async createOrUpdatePlayer(player: TournamentPlayer): Promise<void> {
    if (!player?.MemberID) return;

    const existingPlayer = await Player.findOne({
      where: { memberId: player.MemberID },
    });

    if (existingPlayer) {
      existingPlayer.firstName = player.Firstname;
      existingPlayer.lastName = player.Lastname;
      existingPlayer.gender = player.GenderID === 1 ? 'M' : player.GenderID === 2 ? 'F' : 'M';
      existingPlayer.competitionPlayer = true;
      await existingPlayer.save();
    } else {
      const newPlayer = new Player();
      newPlayer.memberId = player.MemberID;
      newPlayer.firstName = player.Firstname;
      newPlayer.lastName = player.Lastname;
      newPlayer.gender = player.GenderID === 1 ? 'M' : player.GenderID === 2 ? 'F' : 'M';
      newPlayer.competitionPlayer = true;
      await newPlayer.save();
    }
  }
}
