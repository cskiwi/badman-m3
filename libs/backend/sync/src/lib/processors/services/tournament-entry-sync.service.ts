import { TournamentDraw, Entry, Game } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Entry sync is always triggered from a draw job with the draw's internal ID.
 * Entries are created from games found in the draw.
 */
export interface TournamentEntrySyncData {
  drawId: string; // Required internal ID
}

@Injectable()
export class TournamentEntrySyncService {
  private readonly logger = new Logger(TournamentEntrySyncService.name);

  async processEntrySync(job: Job<TournamentEntrySyncData>, updateProgress: (progress: number) => Promise<void>, token: string): Promise<void> {
    this.logger.log(`Processing tournament entry sync`);
    await updateProgress(10);
    const { drawId } = job.data;

    try {
      // Load draw by internal ID
      await updateProgress(15);
      const draw = await TournamentDraw.findOne({
        where: { id: drawId },
        relations: ['tournamentSubEvent', 'tournamentSubEvent.tournamentEvent'],
      });
      await updateProgress(35);

      if (!draw) {
        throw new Error(`Tournament draw with id ${drawId} not found for entry sync`);
      }

      this.logger.debug(`Found draw: ${draw.id} (${draw.visualCode}), subeventId: ${draw.subeventId}`);

      // Create entries from existing games if entries don't exist
      await updateProgress(40);
      await this.createEntriesFromGames(draw);
      await updateProgress(70);

      await updateProgress(90);
      this.logger.log(`Completed tournament entry sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament entry sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  private async createEntriesFromGames(draw: TournamentDraw): Promise<void> {
    this.logger.debug(`Creating entries from games for draw ${draw.id} (${draw.visualCode})`);

    // Get existing entries for this draw
    const existingEntries = await Entry.find({
      where: { drawId: draw.id },
    });

    this.logger.debug(`Draw ${draw.visualCode} has ${existingEntries.length} existing entries`);

    // Get games for this draw
    const games = await Game.find({
      where: {
        linkId: draw.id,
        linkType: 'tournament',
      },
      relations: ['gamePlayerMemberships', 'gamePlayerMemberships.gamePlayer'],
    });

    if (games.length === 0) {
      this.logger.debug(`No games found for draw ${draw.visualCode}, skipping entry creation`);
      return;
    }

    this.logger.debug(`Found ${games.length} games for draw ${draw.visualCode}, checking for new entries`);

    // Collect unique player combinations (teams) from games
    const teamPlayerCombinations = new Set<string>();

    for (const game of games) {
      if (!game.gamePlayerMemberships || game.gamePlayerMemberships.length === 0) {
        this.logger.debug(`Game ${game.id} has no player memberships`);
        continue;
      }

      // Group players by team
      const team1Players = game.gamePlayerMemberships
        .filter((pm) => pm.team === 1)
        .map((pm) => pm.playerId)
        .filter((id): id is string => id !== undefined)
        .sort();

      const team2Players = game.gamePlayerMemberships
        .filter((pm) => pm.team === 2)
        .map((pm) => pm.playerId)
        .filter((id): id is string => id !== undefined)
        .sort();

      this.logger.debug(
        `Game ${game.id}: Team1=[${team1Players.join(',')}] Team2=[${team2Players.join(',')}]`,
      );

      if (team1Players.length > 0) {
        const team1Key = JSON.stringify(team1Players);
        teamPlayerCombinations.add(team1Key);
        this.logger.debug(`Added team1 combination: ${team1Key}`);
      }
      if (team2Players.length > 0) {
        const team2Key = JSON.stringify(team2Players);
        teamPlayerCombinations.add(team2Key);
        this.logger.debug(`Added team2 combination: ${team2Key}`);
      }
    }

    this.logger.debug(`Found ${teamPlayerCombinations.size} unique player combinations in games`);
    this.logger.debug(`Team combinations: ${Array.from(teamPlayerCombinations).join(' | ')}`);

    // Build set of existing team combinations to avoid duplicates
    const existingTeamCombinations = new Set<string>();
    for (const entry of existingEntries) {
      const playerIds = [entry.player1Id, entry.player2Id].filter(Boolean).sort();
      const key = JSON.stringify(playerIds);
      existingTeamCombinations.add(key);
      this.logger.debug(`Existing entry ${entry.id}: ${key}`);
    }
    this.logger.debug(`Existing team combinations: ${Array.from(existingTeamCombinations).join(' | ')}`);

    // Create entries only for NEW team combinations
    let createdCount = 0;
    for (const teamPlayersStr of teamPlayerCombinations) {
      // Check if this team combination already has an entry
      if (existingTeamCombinations.has(teamPlayersStr)) {
        continue;
      }

      const playerIds = JSON.parse(teamPlayersStr) as string[];

      const newEntry = new Entry();
      newEntry.drawId = draw.id;
      newEntry.subEventId = draw.subeventId;
      newEntry.entryType = 'tournament';

      // Set player IDs
      if (playerIds.length >= 1) {
        newEntry.player1Id = playerIds[0];
      }
      if (playerIds.length >= 2) {
        newEntry.player2Id = playerIds[1];
      }

      await newEntry.save();
      createdCount++;
    }

    if (createdCount > 0) {
      this.logger.log(`Created ${createdCount} new entries for draw ${draw.visualCode} (total: ${existingEntries.length + createdCount})`);
    } else {
      this.logger.debug(`No new entries needed for draw ${draw.visualCode} - all teams already have entries`);
    }
  }
}
