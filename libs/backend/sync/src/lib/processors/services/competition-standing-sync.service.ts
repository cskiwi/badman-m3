import {
  CompetitionDraw,
  CompetitionEncounter,
  Entry as EntryModel,
  Game,
  Standing,
  Team,
} from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { In } from 'typeorm';

/**
 * Standing sync can be triggered in two ways:
 * 1. Manual: by drawId (draw must exist)
 * 2. Parent job: by drawId (draw must exist - standings are always calculated after encounters)
 */
export interface CompetitionStandingSyncData {
  drawId: string;
}

@Injectable()
export class CompetitionStandingSyncService {
  private readonly logger = new Logger(CompetitionStandingSyncService.name);

  async processStandingSync(
    job: Job<CompetitionStandingSyncData>,
    updateProgress: (progress: number) => Promise<void>,
    token: string,
  ): Promise<void> {
    this.logger.log(`Processing competition standing sync`);
    await updateProgress(10);
    const { drawId } = job.data;

    try {
      // Step 1: Load the draw
      const draw = await CompetitionDraw.findOne({
        where: { id: drawId },
        relations: ['competitionSubEvent', 'competitionSubEvent.competitionEvent'],
      });
      await updateProgress(20);

      if (!draw) {
        throw new Error(`Competition draw with id ${drawId} not found`);
      }

      this.logger.debug(`Found draw: ${draw.id} (${draw.visualCode}), subeventId: ${draw.subeventId}`);

      // Step 2: Get all encounters for this draw
      const encounters = await CompetitionEncounter.find({
        where: { drawId: draw.id },
      });
      await updateProgress(30);

      this.logger.debug(`Found ${encounters.length} encounters for draw ${draw.id}`);

      if (encounters.length === 0) {
        this.logger.debug(`No encounters found for draw ${draw.id}`);
        await updateProgress(100);
        return;
      }

      // Step 3: Get all teams from encounters
      const teams = await this.getTeamsFromEncounters(encounters);
      await updateProgress(40);

      this.logger.debug(`Found ${teams.size} teams in encounters`);

      if (teams.size === 0) {
        this.logger.debug(`No teams found in encounters for draw ${draw.id}`);
        await updateProgress(100);
        return;
      }

      // Step 4: Get or create standings for each team
      const standings = await this.getOrCreateStandings(draw, teams);
      await updateProgress(50);

      // Step 5: Reset standings before recalculating
      for (const standing of standings.values()) {
        this.resetStanding(standing);
      }

      // Step 6: Get all games for the encounters
      const encounterIds = encounters.map((e) => e.id);
      const games = await Game.find({
        where: {
          linkId: In(encounterIds),
          linkType: 'competition',
        },
      });
      await updateProgress(60);

      this.logger.debug(`Found ${games.length} games for standings calculation`);

      // Step 7: Process encounters and update standings
      for (const encounter of encounters) {
        await this.processEncounter(encounter, teams, standings, games);
      }
      await updateProgress(80);

      // Step 8: Calculate positions and save standings
      await this.finalizeAndSaveStandings(draw, standings);
      await updateProgress(100);

      this.logger.log(`Completed competition standing sync - updated ${standings.size} standings`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition standing sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  /**
   * Get all unique teams from encounters
   */
  private async getTeamsFromEncounters(encounters: CompetitionEncounter[]): Promise<Map<string, Team>> {
    const teamIds = new Set<string>();

    for (const encounter of encounters) {
      if (encounter.homeTeamId) teamIds.add(encounter.homeTeamId);
      if (encounter.awayTeamId) teamIds.add(encounter.awayTeamId);
    }

    if (teamIds.size === 0) {
      return new Map();
    }

    const teams = await Team.find({
      where: { id: In([...teamIds]) },
    });

    const teamMap = new Map<string, Team>();
    for (const team of teams) {
      teamMap.set(team.id, team);
    }

    return teamMap;
  }

  /**
   * Get or create Entry and Standing for each team
   */
  private async getOrCreateStandings(
    draw: CompetitionDraw,
    teams: Map<string, Team>,
  ): Promise<Map<string, Standing>> {
    const standings = new Map<string, Standing>();

    for (const [teamId, team] of teams) {
      // Find or create entry for this team in this draw
      let entry = await EntryModel.findOne({
        where: {
          teamId: teamId,
          drawId: draw.id,
        },
      });

      if (!entry) {
        entry = new EntryModel();
        entry.teamId = teamId;
        entry.drawId = draw.id;
        entry.subEventId = draw.subeventId;
        await entry.save();
        this.logger.debug(`Created entry for team ${team.name} (${teamId}) in draw ${draw.id}`);
      }

      // Find or create standing for this entry
      let standing = await Standing.findOne({
        where: { entryId: entry.id },
      });

      if (!standing) {
        standing = new Standing();
        standing.entryId = entry.id;
        // Set all required fields with default values
        standing.position = 0;
        standing.played = 0;
        standing.points = 0;
        standing.gamesWon = 0;
        standing.gamesLost = 0;
        standing.setsWon = 0;
        standing.setsLost = 0;
        standing.totalPointsWon = 0;
        standing.totalPointsLost = 0;
        standing.won = 0;
        standing.lost = 0;
        standing.tied = 0;
        await standing.save();
        this.logger.debug(`Created standing for entry ${entry.id}`);
      }

      standings.set(teamId, standing);
    }

    return standings;
  }

  /**
   * Reset standing counts to zero
   */
  private resetStanding(standing: Standing): void {
    standing.position = 0;
    standing.played = 0;
    standing.points = 0;
    standing.gamesWon = 0;
    standing.gamesLost = 0;
    standing.setsWon = 0;
    standing.setsLost = 0;
    standing.totalPointsWon = 0;
    standing.totalPointsLost = 0;
    standing.won = 0;
    standing.lost = 0;
    standing.tied = 0;
  }

  /**
   * Process a single encounter and update team standings
   */
  private async processEncounter(
    encounter: CompetitionEncounter,
    teams: Map<string, Team>,
    standings: Map<string, Standing>,
    games: Game[],
  ): Promise<void> {
    if (!encounter.homeTeamId || !encounter.awayTeamId) {
      return;
    }

    const homeStanding = standings.get(encounter.homeTeamId);
    const awayStanding = standings.get(encounter.awayTeamId);

    if (!homeStanding || !awayStanding) {
      this.logger.debug(`Missing standing for encounter ${encounter.id}`);
      return;
    }

    // Skip if encounter hasn't been played yet (both scores are 0 or null)
    const homeScore = encounter.homeScore ?? 0;
    const awayScore = encounter.awayScore ?? 0;

    if (homeScore === 0 && awayScore === 0) {
      return;
    }

    // Count played encounters
    homeStanding.played = (homeStanding.played ?? 0) + 1;
    awayStanding.played = (awayStanding.played ?? 0) + 1;

    // Determine winner and assign points
    if (homeScore > awayScore) {
      homeStanding.won = (homeStanding.won ?? 0) + 1;
      awayStanding.lost = (awayStanding.lost ?? 0) + 1;
      homeStanding.points = (homeStanding.points ?? 0) + 2;
    } else if (homeScore < awayScore) {
      awayStanding.won = (awayStanding.won ?? 0) + 1;
      homeStanding.lost = (homeStanding.lost ?? 0) + 1;
      awayStanding.points = (awayStanding.points ?? 0) + 2;
    } else {
      // Draw
      homeStanding.tied = (homeStanding.tied ?? 0) + 1;
      awayStanding.tied = (awayStanding.tied ?? 0) + 1;
      homeStanding.points = (homeStanding.points ?? 0) + 1;
      awayStanding.points = (awayStanding.points ?? 0) + 1;
    }

    // Process individual games within this encounter
    const encounterGames = games.filter((g) => g.linkId === encounter.id);

    for (const game of encounterGames) {
      // Count games won/lost based on winner
      if (game.winner === 1) {
        homeStanding.gamesWon = (homeStanding.gamesWon ?? 0) + 1;
        awayStanding.gamesLost = (awayStanding.gamesLost ?? 0) + 1;
      } else if (game.winner === 2) {
        awayStanding.gamesWon = (awayStanding.gamesWon ?? 0) + 1;
        homeStanding.gamesLost = (homeStanding.gamesLost ?? 0) + 1;
      }

      // Process set 1
      this.processSet(
        game.set1Team1,
        game.set1Team2,
        homeStanding,
        awayStanding,
      );

      // Process set 2
      this.processSet(
        game.set2Team1,
        game.set2Team2,
        homeStanding,
        awayStanding,
      );

      // Process set 3 (if played)
      if ((game.set3Team1 ?? 0) !== 0 || (game.set3Team2 ?? 0) !== 0) {
        this.processSet(
          game.set3Team1,
          game.set3Team2,
          homeStanding,
          awayStanding,
        );
      }
    }
  }

  /**
   * Process a single set and update standings
   */
  private processSet(
    team1Score: number | null | undefined,
    team2Score: number | null | undefined,
    homeStanding: Standing,
    awayStanding: Standing,
  ): void {
    const score1 = team1Score ?? 0;
    const score2 = team2Score ?? 0;

    if (score1 === 0 && score2 === 0) {
      return;
    }

    // Update total points
    homeStanding.totalPointsWon = (homeStanding.totalPointsWon ?? 0) + score1;
    homeStanding.totalPointsLost = (homeStanding.totalPointsLost ?? 0) + score2;
    awayStanding.totalPointsWon = (awayStanding.totalPointsWon ?? 0) + score2;
    awayStanding.totalPointsLost = (awayStanding.totalPointsLost ?? 0) + score1;

    // Update sets won/lost
    if (score1 > score2) {
      homeStanding.setsWon = (homeStanding.setsWon ?? 0) + 1;
      awayStanding.setsLost = (awayStanding.setsLost ?? 0) + 1;
    } else if (score1 < score2) {
      awayStanding.setsWon = (awayStanding.setsWon ?? 0) + 1;
      homeStanding.setsLost = (homeStanding.setsLost ?? 0) + 1;
    }
  }

  /**
   * Calculate positions and save all standings
   */
  private async finalizeAndSaveStandings(
    draw: CompetitionDraw,
    standings: Map<string, Standing>,
  ): Promise<void> {
    // Convert to array and sort
    const standingsArray = [...standings.values()];

    // Sort by points (desc), games won (desc), sets won (desc), total points won (desc)
    standingsArray.sort((a, b) => {
      // First by points
      if ((b.points ?? 0) !== (a.points ?? 0)) {
        return (b.points ?? 0) - (a.points ?? 0);
      }
      // Then by games won
      if ((b.gamesWon ?? 0) !== (a.gamesWon ?? 0)) {
        return (b.gamesWon ?? 0) - (a.gamesWon ?? 0);
      }
      // Then by sets won
      if ((b.setsWon ?? 0) !== (a.setsWon ?? 0)) {
        return (b.setsWon ?? 0) - (a.setsWon ?? 0);
      }
      // Finally by total points won
      return (b.totalPointsWon ?? 0) - (a.totalPointsWon ?? 0);
    });

    // Assign positions and save
    let position = 1;
    for (const standing of standingsArray) {
      standing.position = position;
      standing.size = standingsArray.length;

      // Determine riser/faller based on draw configuration
      standing.riser = position <= (draw.risers ?? 0);
      standing.faller = position > standingsArray.length - (draw.fallers ?? 0);

      await standing.save();
      position++;
    }

    this.logger.debug(`Saved ${standingsArray.length} standings with positions`);
  }
}
