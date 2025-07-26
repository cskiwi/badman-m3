import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { TournamentApiClient, TournamentEvent, Entry, TournamentDraw, Match } from '@app/tournament-api';
import {
  TOURNAMENT_SYNC_QUEUE,
  TournamentSyncJobType,
  StructureSyncJobData,
  GameSyncJobData,
} from '../queues/tournament-sync.queue';

@Injectable()
@Processor(TOURNAMENT_SYNC_QUEUE)
export class TournamentEventProcessor {
  private readonly logger = new Logger(TournamentEventProcessor.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
  ) {}

  @Process(TournamentSyncJobType.TOURNAMENT_STRUCTURE_SYNC)
  async processTournamentStructureSync(job: Job<StructureSyncJobData>): Promise<void> {
    this.logger.log(`Processing tournament structure sync job: ${job.id}`);
    
    try {
      const { tournamentCode, eventCodes, forceUpdate } = job.data;
      
      // Get tournament details first
      const tournament = await this.tournamentApiClient.getTournamentDetails(tournamentCode);
      this.logger.log(`Syncing tournament structure for: ${tournament.Name}`);

      // Sync events
      await this.syncEvents(tournamentCode, eventCodes);
      
      // Sync entries (players)
      await this.syncEntries(tournamentCode, eventCodes);
      
      // Sync draws
      await this.syncDraws(tournamentCode, eventCodes);

      this.logger.log(`Completed tournament structure sync job: ${job.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process tournament structure sync: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  @Process(TournamentSyncJobType.TOURNAMENT_GAME_SYNC)
  async processTournamentGameSync(job: Job<GameSyncJobData>): Promise<void> {
    this.logger.log(`Processing tournament game sync job: ${job.id}`);
    
    try {
      const { tournamentCode, eventCode, drawCode, matchCodes, date } = job.data;
      
      let matches: Match[] = [];
      
      if (matchCodes && matchCodes.length > 0) {
        // Sync specific matches
        for (const matchCode of matchCodes) {
          try {
            const match = await this.tournamentApiClient.getMatchDetails(tournamentCode, matchCode);
            matches.push(match);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`Failed to get match ${matchCode}: ${errorMessage}`);
          }
        }
      } else if (drawCode) {
        // Sync all matches in a draw
        matches = await this.tournamentApiClient.getMatchesByDraw(tournamentCode, drawCode);
      } else if (date) {
        // Sync matches by date
        matches = await this.tournamentApiClient.getMatchesByDate(tournamentCode, date);
      } else {
        // Sync all recent matches (tournament duration + 1 day)
        const tournament = await this.tournamentApiClient.getTournamentDetails(tournamentCode);
        const startDate = new Date(tournament.StartDate);
        const endDate = new Date(tournament.EndDate);
        endDate.setDate(endDate.getDate() + 1); // Add one day buffer
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          try {
            const dayMatches = await this.tournamentApiClient.getMatchesByDate(tournamentCode, dateStr);
            matches.push(...dayMatches);
          } catch (error: unknown) {
            this.logger.debug(`No matches found for date ${dateStr}`);
          }
        }
      }

      // Process matches
      for (const match of matches) {
        await this.processMatch(tournamentCode, match, false); // false = isCompetition
      }

      this.logger.log(`Completed tournament game sync job: ${job.id} - processed ${matches.length} matches`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process tournament game sync: ${errorMessage}`, errorStack);
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
        ? await Promise.all(eventCodes.map(code => this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
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
        ? await Promise.all(eventCodes.map(code => this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
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
    // TODO: Implement database upsert for tournament event
    const eventData = {
      tournamentCode,
      externalCode: event.Code,
      name: event.Name,
      genderType: this.mapGenderType(event.GenderID),
      gameType: this.mapGameType(event.GameTypeID),
      level: event.LevelID,
      paraClass: event.ParaClassID,
    };

    this.logger.debug(`Creating/updating event: ${event.Name} (${event.Code})`);
    // await this.eventRepository.upsert(eventData, ['tournamentCode', 'externalCode']);
  }

  private async createOrUpdateEntry(tournamentCode: string, eventCode: string, entry: Entry): Promise<void> {
    // TODO: Implement database upsert for tournament entry
    const entryData = {
      tournamentCode,
      eventCode,
      stageCode: entry.StageEntries?.StageEntry?.StageCode,
      seed: entry.StageEntries?.StageEntry?.Seed,
      
      // Player 1 (always present)
      player1MemberId: entry.Player1.MemberID,
      player1Firstname: entry.Player1.Firstname,
      player1Lastname: entry.Player1.Lastname,
      player1GenderType: this.mapGenderType(entry.Player1.GenderID),
      player1CountryCode: entry.Player1.CountryCode,
      
      // Player 2 (for doubles)
      player2MemberId: entry.Player2?.MemberID,
      player2Firstname: entry.Player2?.Firstname,
      player2Lastname: entry.Player2?.Lastname,
      player2GenderType: entry.Player2 ? this.mapGenderType(entry.Player2.GenderID) : null,
      player2CountryCode: entry.Player2?.CountryCode,
    };

    this.logger.debug(`Creating/updating entry: ${entry.Player1.Firstname} ${entry.Player1.Lastname}${entry.Player2 ? ` / ${entry.Player2.Firstname} ${entry.Player2.Lastname}` : ''}`);
    // await this.entryRepository.upsert(entryData, ['tournamentCode', 'eventCode', 'player1MemberId', 'player2MemberId']);
    
    // Also ensure players exist in our system
    await this.createOrUpdatePlayer(entry.Player1);
    if (entry.Player2) {
      await this.createOrUpdatePlayer(entry.Player2);
    }
  }

  private async createOrUpdatePlayer(player: any): Promise<void> {
    // TODO: Implement player upsert - check if player exists by MemberID and update if needed
    const playerData = {
      memberId: player.MemberID,
      firstname: player.Firstname,
      lastname: player.Lastname,
      genderType: this.mapGenderType(player.GenderID),
      countryCode: player.CountryCode,
    };

    this.logger.debug(`Creating/updating player: ${player.Firstname} ${player.Lastname} (${player.MemberID})`);
    // await this.playerRepository.upsert(playerData, ['memberId']);
  }

  private async createOrUpdateDraw(tournamentCode: string, eventCode: string, draw: TournamentDraw): Promise<void> {
    // TODO: Implement database upsert for tournament draw
    const drawData = {
      tournamentCode,
      eventCode,
      externalCode: draw.Code,
      name: draw.Name,
      type: this.mapDrawType(draw.TypeID),
      size: draw.Size,
      qualification: draw.Qualification,
      stageCode: draw.StageCode,
      position: draw.Position,
    };

    this.logger.debug(`Creating/updating draw: ${draw.Name} (${draw.Code})`);
    // await this.drawRepository.upsert(drawData, ['tournamentCode', 'eventCode', 'externalCode']);
  }

  private async processMatch(tournamentCode: string, match: Match, isCompetition: boolean): Promise<void> {
    // TODO: Implement match processing and database upsert
    const matchData = {
      tournamentCode,
      externalCode: match.Code,
      eventCode: match.EventCode,
      eventName: match.EventName,
      drawCode: match.DrawCode,
      drawName: match.DrawName,
      roundName: match.RoundName,
      winner: match.Winner,
      scoreStatus: match.ScoreStatus,
      matchTime: match.MatchTime ? new Date(match.MatchTime) : null,
      courtCode: match.CourtCode,
      courtName: match.CourtName,
      locationCode: match.LocationCode,
      locationName: match.LocationName,
      duration: match.Duration,
      isCompetition,
      
      // Team/Player info
      team1Player1Id: match.Team1?.Player1?.MemberID,
      team1Player2Id: match.Team1?.Player2?.MemberID,
      team2Player1Id: match.Team2?.Player1?.MemberID,
      team2Player2Id: match.Team2?.Player2?.MemberID,
      
      // Sets/scores
      sets: match.Sets?.Set || [],
    };

    this.logger.debug(`Processing match: ${match.Code} - ${match.EventName}`);
    // await this.matchRepository.upsert(matchData, ['tournamentCode', 'externalCode']);
    
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

  // Helper methods for mapping
  private mapGenderType(genderId: number): string {
    switch (genderId) {
      case 1: return 'men';
      case 2: return 'women';
      case 3: return 'mixed';
      default: return 'unknown';
    }
  }

  private mapGameType(gameTypeId: number): string {
    switch (gameTypeId) {
      case 1: return 'singles';
      case 2: return 'doubles';
      default: return 'unknown';
    }
  }

  private mapDrawType(drawTypeId: number): string {
    switch (drawTypeId) {
      case 0: return 'knockout';
      case 3: return 'round_robin';
      default: return 'unknown';
    }
  }
}