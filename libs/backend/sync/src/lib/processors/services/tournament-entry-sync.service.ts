import { TournamentDraw, Entry, Game } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export interface TournamentEntrySyncData {
  tournamentCode: string;
  eventCode?: string;
  drawCode: string;
  drawId?: string;
}

@Injectable()
export class TournamentEntrySyncService {
  private readonly logger = new Logger(TournamentEntrySyncService.name);

  async processEntrySync(job: Job<TournamentEntrySyncData>, updateProgress: (progress: number) => Promise<void>, token: string): Promise<void> {
    this.logger.log(`Processing tournament entry sync`);
    await updateProgress(10);
    const { tournamentCode, eventCode, drawCode, drawId } = job.data;

    try {
      // Require internal drawId for exact match
      await updateProgress(15);
      if (!drawId) {
        throw new Error(`drawId is required for tournament entry sync (drawCode: ${drawCode})`);
      }

      const draw = await TournamentDraw.findOne({
        where: { id: drawId },
        relations: ['tournamentSubEvent', 'tournamentSubEvent.tournamentEvent'],
      });
      await updateProgress(35);

      if (!draw) {
        throw new Error(`Tournament draw with id ${drawId} not found for entry sync`);
      }

      this.logger.debug(`Found draw: ${draw.id} with code ${drawCode}, subeventId: ${draw.subeventId}`);

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

    // Check if entries already exist for this draw
    const existingEntries = await Entry.find({
      where: { drawId: draw.id },
    });

    if (existingEntries.length > 0) {
      this.logger.debug(`Draw ${draw.visualCode} already has ${existingEntries.length} entries, skipping creation`);
      return;
    }

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

    this.logger.debug(`Found ${games.length} games for draw ${draw.visualCode}, creating entries`);

    // Collect unique player combinations (teams)
    const teamPlayerCombinations = new Set<string>();

    for (const game of games) {
      if (!game.gamePlayerMemberships || game.gamePlayerMemberships.length === 0) {
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

      if (team1Players.length > 0) {
        teamPlayerCombinations.add(JSON.stringify(team1Players));
      }
      if (team2Players.length > 0) {
        teamPlayerCombinations.add(JSON.stringify(team2Players));
      }
    }

    this.logger.debug(`Found ${teamPlayerCombinations.size} unique player combinations`);

    // Create entries for each unique team combination
    for (const teamPlayersStr of teamPlayerCombinations) {
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
    }

    this.logger.log(`Created ${teamPlayerCombinations.size} entries for draw ${draw.visualCode}`);
  }
}
