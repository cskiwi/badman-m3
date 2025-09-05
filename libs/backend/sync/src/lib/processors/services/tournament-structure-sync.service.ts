import { TournamentApiClient, TournamentEvent, Entry, Player as TournamentPlayer, TournamentDraw } from '@app/backend-tournament-api';
import {
  Entry as EntryModel,
  Player,
  TournamentDraw as TournamentDrawModel,
  TournamentEvent as TournamentEventModel,
  TournamentSubEvent,
} from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { TournamentPlanningService } from './tournament-planning.service';
import { StructureSyncJobData } from '../../queues';

@Injectable()
export class TournamentStructureSyncService {
  private readonly logger = new Logger(TournamentStructureSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly tournamentPlanningService: TournamentPlanningService,
  ) {}

  async processStructureSync(data: StructureSyncJobData, updateProgress: (progress: number) => Promise<void>): Promise<void> {
    this.logger.log(`Processing tournament structure sync`);

    try {
      const { tournamentCode, eventCodes } = data;

      // Initialize progress
      await updateProgress(0);

      // Get tournament details first
      const tournament = await this.tournamentApiClient.getTournamentDetails(tournamentCode);
      this.logger.log(`Syncing tournament structure for: ${tournament.Name}`);

      // Calculate work plan for more accurate progress tracking
      const workPlan = await this.tournamentPlanningService.calculateTournamentWorkPlan(tournamentCode, eventCodes, data.includeSubComponents);

      this.logger.log(`Work plan: ${workPlan.totalJobs} total operations`);
      let completedOperations = 0;

      // Sync events
      await this.syncEvents(tournamentCode, eventCodes);
      completedOperations += workPlan.breakdown.events;
      const eventsProgress = this.tournamentPlanningService.calculateProgress(completedOperations, workPlan.totalJobs, true);
      await updateProgress(eventsProgress);
      this.logger.debug(`Completed events sync (${completedOperations}/${workPlan.totalJobs})`);

      // Sync entries (players)
      await this.syncEntries(tournamentCode, eventCodes);
      completedOperations += workPlan.breakdown.draws; // Using draws count as proxy for entry operations
      const entriesProgress = this.tournamentPlanningService.calculateProgress(completedOperations, workPlan.totalJobs, true);
      await updateProgress(entriesProgress);
      this.logger.debug(`Completed entries sync (${completedOperations}/${workPlan.totalJobs})`);

      // Sync draws
      await this.syncDraws(tournamentCode, eventCodes);
      completedOperations = workPlan.totalJobs;
      const finalProgress = this.tournamentPlanningService.calculateProgress(completedOperations, workPlan.totalJobs, true);
      await updateProgress(finalProgress);
      this.logger.debug(`Completed draws sync (${completedOperations}/${workPlan.totalJobs})`);

      this.logger.log(`Completed tournament structure sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process tournament structure sync: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  private async syncEvents(tournamentCode: string, eventCodes?: string[]): Promise<void> {
    this.logger.log(`Syncing events for tournament ${tournamentCode}`);

    try {
      let events: TournamentEvent[] = [];

      if (eventCodes && eventCodes.length > 0) {
        // Sync specific events
        for (const eventCode of eventCodes) {
          const eventList = await this.tournamentApiClient.getTournamentEvents(tournamentCode, eventCode);
          events.push(...eventList);
        }
      } else {
        // Sync all events
        events = await this.tournamentApiClient.getTournamentEvents(tournamentCode);
      }

      for (const event of events) {
        await this.createOrUpdateEvent(tournamentCode, event);
      }

      this.logger.log(`Synced ${events.length} events`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync events: ${errorMessage}`);
      throw error;
    }
  }

  private async syncEntries(tournamentCode: string, eventCodes?: string[]): Promise<void> {
    this.logger.log(`Syncing entries for tournament ${tournamentCode}`);

    try {
      // Get events to sync entries for
      const events = eventCodes
        ? await Promise.all(eventCodes.map((code) => this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
        : [await this.tournamentApiClient.getTournamentEvents(tournamentCode)];

      const flatEvents = events.flat();

      for (const event of flatEvents) {
        try {
          const entries = await this.tournamentApiClient.getEventEntries(tournamentCode, event.Code);

          for (const entry of entries) {
            await this.createOrUpdateEntry(tournamentCode, event.Code, entry);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to sync entries for event ${event.Code}: ${errorMessage}`);
        }
      }

      this.logger.log(`Synced entries for ${flatEvents.length} events`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync entries: ${errorMessage}`);
      throw error;
    }
  }

  private async syncDraws(tournamentCode: string, eventCodes?: string[]): Promise<void> {
    this.logger.log(`Syncing draws for tournament ${tournamentCode}`);

    try {
      // Get events to sync draws for
      const events = eventCodes
        ? await Promise.all(eventCodes.map((code) => this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
        : [await this.tournamentApiClient.getTournamentEvents(tournamentCode)];

      const flatEvents = events.flat();

      for (const event of flatEvents) {
        try {
          const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, event.Code);

          for (const draw of draws) {
            await this.createOrUpdateDraw(tournamentCode, event.Code, draw);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to sync draws for event ${event.Code}: ${errorMessage}`);
        }
      }

      this.logger.log(`Synced draws for ${flatEvents.length} events`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync draws: ${errorMessage}`);
      throw error;
    }
  }

  private async createOrUpdateEvent(tournamentCode: string, event: TournamentEvent): Promise<void> {
    this.logger.debug(`Creating/updating tournament sub-event: ${event.Name} (${event.Code})`);

    // Find the tournament event to link the sub-event to
    const tournamentEvent = await TournamentEventModel.findOne({
      where: { visualCode: tournamentCode },
    });

    if (!tournamentEvent) {
      this.logger.warn(`Tournament with code ${tournamentCode} not found, skipping sub-event creation`);
      return;
    }

    // Check if event already exists within this specific tournament context
    const existingEvent = await TournamentSubEvent.findOne({
      where: {
        visualCode: event.Code,
        eventId: tournamentEvent.id,
      },
    });

    if (existingEvent) {
      existingEvent.name = event.Name;
      existingEvent.eventType = this.mapGenderType(event.GenderID);
      existingEvent.gameType = this.mapGameType(event.GameTypeID);
      existingEvent.level = event.LevelID;
      await existingEvent.save();
      this.logger.debug(`Updated existing sub-event ${event.Code} for tournament ${tournamentCode}`);
    } else {
      const newEvent = new TournamentSubEvent();
      newEvent.name = event.Name;
      newEvent.eventType = this.mapGenderType(event.GenderID);
      newEvent.gameType = this.mapGameType(event.GameTypeID);
      newEvent.level = event.LevelID;
      newEvent.visualCode = event.Code;
      newEvent.eventId = tournamentEvent.id; // Link to parent tournament
      await newEvent.save();
      this.logger.debug(`Created new sub-event ${event.Code} for tournament ${tournamentCode}`);
    }
  }

  private async createOrUpdateEntry(tournamentCode: string, eventCode: string, entry: Entry): Promise<void> {
    this.logger.debug(
      `Processing entry: ${entry.Player1.Firstname} ${entry.Player1.Lastname}${entry.Player2 ? ` / ${entry.Player2.Firstname} ${entry.Player2.Lastname}` : ''}`,
    );

    // Ensure players exist in our system first
    await this.createOrUpdatePlayer(entry.Player1);
    if (entry.Player2) {
      await this.createOrUpdatePlayer(entry.Player2);
    }

    // Find the players in our database
    const player1 = await Player.findOne({ where: { memberId: entry.Player1.MemberID } });
    let player2: Player | null = null;
    if (entry.Player2) {
      player2 = await Player.findOne({ where: { memberId: entry.Player2.MemberID } });
    }

    if (!player1) {
      this.logger.warn(`Player1 not found for entry: ${entry.Player1.MemberID}`);
      return;
    }

    // Find the sub-event
    const subEvent = await TournamentSubEvent.findOne({
      where: { visualCode: eventCode },
    });

    if (!subEvent) {
      this.logger.warn(`Sub-event with code ${eventCode} not found, skipping entry`);
      return;
    }

    // Get all draws for this sub-event to link entries to appropriate draws
    const draws = await TournamentDrawModel.find({
      where: { subeventId: subEvent.id },
    });

    if (draws.length === 0) {
      this.logger.warn(`No draws found for sub-event ${eventCode}, skipping entry`);
      return;
    }

    // For now, link to the first draw found (this could be improved with more specific logic)
    // In tournament structure, typically entries belong to all draws within an event
    for (const draw of draws) {
      // Check if entry already exists for this draw
      const whereCondition: any = {
        drawId: draw.id,
        player1Id: player1.id,
      };

      if (player2) {
        whereCondition.player2Id = player2.id;
      } else {
        whereCondition.player2Id = null;
      }

      const existingEntry = await EntryModel.findOne({
        where: whereCondition,
      });

      if (!existingEntry) {
        // Create new entry
        const newEntry = new EntryModel();
        newEntry.drawId = draw.id;
        newEntry.subEventId = subEvent.id;
        newEntry.player1Id = player1.id;
        newEntry.player2Id = player2?.id || undefined;
        newEntry.entryType = 'tournament';
        await newEntry.save();

        this.logger.debug(`Created entry for draw ${draw.name}`);
      }
    }
  }

  private async createOrUpdatePlayer(player: TournamentPlayer): Promise<void> {
    this.logger.debug(`Creating/updating player: ${player.Firstname} ${player.Lastname} (${player.MemberID})`);

    // Check if player already exists
    const existingPlayer = await Player.findOne({
      where: { memberId: player.MemberID },
    });

    if (existingPlayer) {
      existingPlayer.firstName = player.Firstname;
      existingPlayer.lastName = player.Lastname;
      existingPlayer.gender = this.mapGenderType(player.GenderID) === 'M' ? 'M' : this.mapGenderType(player.GenderID) === 'F' ? 'F' : 'M';
      existingPlayer.competitionPlayer = true;
      await existingPlayer.save();
    } else {
      const newPlayer = new Player();
      newPlayer.memberId = player.MemberID;
      newPlayer.firstName = player.Firstname;
      newPlayer.lastName = player.Lastname;
      newPlayer.gender = this.mapGenderType(player.GenderID) === 'M' ? 'M' : this.mapGenderType(player.GenderID) === 'F' ? 'F' : 'M';
      newPlayer.competitionPlayer = true;
      await newPlayer.save();
    }
  }

  private async createOrUpdateDraw(tournamentCode: string, eventCode: string, draw: TournamentDraw): Promise<void> {
    this.logger.debug(`Creating/updating tournament draw: ${draw.Name} (${draw.Code})`);

    // Find the sub-event that this draw belongs to
    const subEvent = await TournamentSubEvent.findOne({
      where: { visualCode: eventCode },
    });

    if (!subEvent) {
      this.logger.warn(`Sub-event with code ${eventCode} not found, skipping draw ${draw.Code}`);
      return;
    }

    // Check if draw already exists for this specific sub-event context
    const existingDraw = await TournamentDrawModel.findOne({
      where: {
        visualCode: draw.Code,
        subeventId: subEvent.id,
      },
    });

    if (existingDraw) {
      existingDraw.name = draw.Name;
      existingDraw.type = this.mapDrawType(draw.TypeID);
      existingDraw.size = draw.Size;
      await existingDraw.save();
      this.logger.debug(`Updated existing draw ${draw.Code} for sub-event ${subEvent.id}`);
    } else {
      const newDraw = new TournamentDrawModel();
      newDraw.name = draw.Name;
      newDraw.type = this.mapDrawType(draw.TypeID);
      newDraw.size = draw.Size;
      newDraw.visualCode = draw.Code;
      newDraw.subeventId = subEvent.id;
      newDraw.risers = 0;
      newDraw.fallers = 0;
      await newDraw.save();
      this.logger.debug(`Created new draw ${draw.Code} for sub-event ${subEvent.id}`);
    }
  }

  private mapGenderType(genderId: number): string {
    switch (genderId) {
      case 1:
        return 'M';
      case 2:
        return 'F';
      case 3:
        return 'MX';
      default:
        return 'M';
    }
  }

  private mapGameType(gameTypeId: number): string {
    switch (gameTypeId) {
      case 1:
        return 'S';
      case 2:
        return 'D';
      default:
        return 'S';
    }
  }

  private mapDrawType(drawTypeId: number): string {
    switch (drawTypeId) {
      case 0:
        return 'KO'; // Knockout elimination
      case 1:
        return 'QUALIFICATION'; // Qualification rounds
      case 2:
        return 'QUALIFICATION'; // Pre-qualification
      case 3:
        return 'POULE'; // Round-robin groups
      case 4:
        return 'KO'; // Playoff/championship
      case 5:
        return 'QUALIFICATION'; // Qualifying tournament
      default:
        return 'KO'; // Default to knockout
    }
  }
}
