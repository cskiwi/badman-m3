import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { TournamentApiClient, TournamentEvent, Team, TournamentDraw, Match } from '@app/tournament-api';
import {
  TOURNAMENT_SYNC_QUEUE,
  TournamentSyncJobType,
  StructureSyncJobData,
  GameSyncJobData,
} from '../queues/tournament-sync.queue';

@Injectable()
@Processor(TOURNAMENT_SYNC_QUEUE)
export class CompetitionEventProcessor {
  private readonly logger = new Logger(CompetitionEventProcessor.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
  ) {}

  @Process(TournamentSyncJobType.COMPETITION_STRUCTURE_SYNC)
  async processCompetitionStructureSync(job: Job<StructureSyncJobData>): Promise<void> {
    this.logger.log(`Processing competition structure sync job: ${job.id}`);
    
    try {
      const { tournamentCode, eventCodes, forceUpdate } = job.data;
      
      // Get tournament details first
      const tournament = await this.tournamentApiClient.getTournamentDetails(tournamentCode);
      this.logger.log(`Syncing competition structure for: ${tournament.Name}`);

      // Sync events
      await this.syncEvents(tournamentCode, eventCodes);
      
      // Sync teams
      await this.syncTeams(tournamentCode);
      
      // Sync draws/poules
      await this.syncDraws(tournamentCode, eventCodes);

      this.logger.log(`Completed competition structure sync job: ${job.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process competition structure sync: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  @Process(TournamentSyncJobType.COMPETITION_GAME_SYNC)
  async processCompetitionGameSync(job: Job<GameSyncJobData>): Promise<void> {
    this.logger.log(`Processing competition game sync job: ${job.id}`);
    
    try {
      const { tournamentCode, eventCode, drawCode, matchCodes, date } = job.data;
      
      let matches: Match[] = [];
      
      if (matchCodes && matchCodes.length > 0) {
        // Sync specific matches
        for (const matchCode of matchCodes) {
          try {
            const match = await this.tournamentApiClient.getTeamMatch(tournamentCode, matchCode);
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
        // Sync all recent matches (last 7 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          try {
            const dayMatches = await this.tournamentApiClient.getMatchesByDate(tournamentCode, dateStr);
            matches.push(...dayMatches);
          } catch (error) {
            this.logger.debug(`No matches found for date ${dateStr}`);
          }
        }
      }

      // Process matches
      for (const match of matches) {
        await this.processMatch(tournamentCode, match, true); // true = isCompetition
      }

      this.logger.log(`Completed competition game sync job: ${job.id} - processed ${matches.length} matches`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process competition game sync: ${errorMessage}`, errorStack);
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

  private async syncTeams(tournamentCode: string): Promise<void> {
    this.logger.log(`Syncing teams for tournament ${tournamentCode}`);
    
    try {
      const teams = await this.tournamentApiClient.getTournamentTeams(tournamentCode);
      
      for (const team of teams) {
        await this.createOrUpdateTeam(tournamentCode, team);
      }

      this.logger.log(`Synced ${teams.length} teams`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync teams: ${errorMessage}`);
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

  private async createOrUpdateTeam(tournamentCode: string, team: Team): Promise<void> {
    // TODO: Implement team matching logic and database upsert
    const teamData = {
      tournamentCode,
      externalCode: team.Code,
      externalName: team.Name,
      countryCode: team.CountryCode,
      // Add fuzzy matching fields
      normalizedName: this.normalizeTeamName(team.Name),
      clubName: this.extractClubName(team.Name),
      teamNumber: this.extractTeamNumber(team.Name),
      gender: this.extractTeamGender(team.Name),
      strength: this.extractTeamStrength(team.Name),
    };

    this.logger.debug(`Creating/updating team: ${team.Name} (${team.Code})`);
    // await this.teamRepository.upsert(teamData, ['tournamentCode', 'externalCode']);
    
    // Queue team matching if not already matched
    // await this.queueTeamMatching(tournamentCode, team);
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
  }

  // Helper methods for mapping and extraction
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

  private normalizeTeamName(name: string): string {
    return name.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private extractClubName(name: string): string {
    // Extract club name from format: "Club Name 1H (41)"
    const match = name.match(/^(.+?)\s+\d+[HDG]\s*\(\d+\)$/);
    return match ? match[1].trim() : name;
  }

  private extractTeamNumber(name: string): number | null {
    const match = name.match(/\s(\d+)[HDG]\s*\(\d+\)$/);
    return match ? parseInt(match[1], 10) : null;
  }

  private extractTeamGender(name: string): string | null {
    const match = name.match(/\s\d+([HDG])\s*\(\d+\)$/);
    if (match) {
      switch (match[1]) {
        case 'H': return 'men';
        case 'D': return 'women';
        case 'G': return 'mixed';
      }
    }
    return null;
  }

  private extractTeamStrength(name: string): number | null {
    const match = name.match(/\((\d+)\)$/);
    return match ? parseInt(match[1], 10) : null;
  }
}