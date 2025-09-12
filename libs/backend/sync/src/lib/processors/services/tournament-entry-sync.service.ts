import { TournamentDraw, Entry, Game, TournamentEvent as TournamentEventModel, TournamentSubEvent } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { Job, WaitingChildrenError } from 'bullmq';

export interface TournamentEntrySyncData {
  tournamentCode: string;
  drawCode: string;
}

@Injectable()
export class TournamentEntrySyncService {
  private readonly logger = new Logger(TournamentEntrySyncService.name);

  async processEntrySync(job: Job<TournamentEntrySyncData>, updateProgress: (progress: number) => Promise<void>, token: string): Promise<void> {
    this.logger.log(`Processing tournament entry sync`);
    await updateProgress(10);
    const { tournamentCode, drawCode } = job.data;

    try {
      // Find the tournament event first to get proper context
      await updateProgress(15);
      const tournamentEvent = await TournamentEventModel.findOne({
        where: { visualCode: tournamentCode },
      });
      await updateProgress(20);

      if (!tournamentEvent) {
        this.logger.warn(`Tournament with code ${tournamentCode} not found, skipping entry sync`);
        return;
      }

      this.logger.debug(`Found tournament: ${tournamentEvent.id} with code ${tournamentCode}`);

      // Find the draw with tournament context to avoid visualCode ambiguity
      await updateProgress(30);
      const draw = await TournamentDraw.findOne({
        where: {
          visualCode: drawCode,
          tournamentSubEvent: {
            tournamentEvent: {
              id: tournamentEvent.id,
            },
          },
        },
        relations: ['tournamentSubEvent', 'tournamentSubEvent.tournamentEvent'],
      });
      await updateProgress(35);

      if (!draw) {
        this.logger.warn(`Draw with code ${drawCode} not found for tournament ${tournamentCode}, skipping entry sync`);
        return;
      }

      this.logger.debug(`Found draw: ${draw.id} with code ${drawCode}, subeventId: ${draw.subeventId}`);

      // Verify the draw belongs to the correct tournament
      if (draw.tournamentSubEvent) {
        // Load the subevent with tournament relation to check eventId
        const subEvent = await TournamentSubEvent.findOne({
          where: { id: draw.tournamentSubEvent.id },
          relations: ['tournamentEvent'],
        });

        this.logger.debug(`Found subEvent: ${subEvent?.id}, eventId: ${subEvent?.eventId}, tournament eventId: ${tournamentEvent.id}`);

        if (!subEvent || subEvent.eventId !== tournamentEvent.id) {
          // Try to repair the relationship if the sub-event exists but has wrong eventId
          if (subEvent && subEvent.eventId !== tournamentEvent.id) {
            this.logger.log(`Attempting to repair orphaned sub-event relationship for draw ${drawCode}`);
            await this.repairSubEventRelationship(subEvent, tournamentEvent);
            // Continue with entry sync after repair
          } else {
            this.logger.warn(
              `Draw ${drawCode} does not belong to tournament ${tournamentCode}. SubEvent eventId: ${subEvent?.eventId}, Tournament id: ${tournamentEvent.id}, skipping entry sync`,
            );
            return;
          }
        }
      } else {
        this.logger.warn(`Draw ${drawCode} has no tournamentSubEvent relation, skipping entry sync`);
        return;
      }

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

  private async repairSubEventRelationship(subEvent: TournamentSubEvent, tournamentEvent: TournamentEventModel): Promise<void> {
    try {
      this.logger.log(
        `Repairing sub-event ${subEvent.id} (${subEvent.visualCode}) to link to tournament ${tournamentEvent.id} (${tournamentEvent.visualCode})`,
      );

      subEvent.eventId = tournamentEvent.id;
      await subEvent.save();

      this.logger.log(`Successfully repaired sub-event relationship`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to repair sub-event relationship: ${errorMessage}`, error);
      throw error;
    }
  }
}
