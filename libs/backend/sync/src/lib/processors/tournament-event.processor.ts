import { GameStatus, GameType } from '@app/models-enum';
import { Game, Player, TournamentDraw as TournamentDrawModel, TournamentSubEvent } from '@app/models';
import { Entry, Match, TournamentApiClient, TournamentDraw, TournamentEvent } from '@app/backend-tournament-api';
import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { GameSyncJobData, StructureSyncJobData, SYNC_QUEUE, SyncJobType } from '../queues/sync.queue';

@Injectable()
@Processor(SYNC_QUEUE)
export class TournamentEventProcessor {
  private readonly logger = new Logger(TournamentEventProcessor.name);

  constructor(private readonly tournamentApiClient: TournamentApiClient) {}

  @Process(SyncJobType.TOURNAMENT_STRUCTURE_SYNC)
  async processTournamentStructureSync(job: Job<StructureSyncJobData>): Promise<void> {
    this.logger.log(`Processing tournament structure sync job: ${job.id}`);

    try {
      const { tournamentCode, eventCodes, forceUpdate } = job.data;

      // Initialize progress
      await job.progress(0);

      // Get tournament details first
      const tournament = await this.tournamentApiClient.getTournamentDetails(tournamentCode);
      this.logger.log(`Syncing tournament structure for: ${tournament.Name}`);

      // Calculate total work units (3 main operations: events, entries, draws)
      const totalSteps = 3;
      let currentStep = 0;

      // Sync events
      await this.syncEvents(tournamentCode, eventCodes);
      currentStep++;
      await job.progress(Math.round((currentStep / totalSteps) * 100));
      this.logger.debug(`Completed events sync (${currentStep}/${totalSteps})`);

      // Sync entries (players)
      await this.syncEntries(tournamentCode, eventCodes);
      currentStep++;
      await job.progress(Math.round((currentStep / totalSteps) * 100));
      this.logger.debug(`Completed entries sync (${currentStep}/${totalSteps})`);

      // Sync draws
      await this.syncDraws(tournamentCode, eventCodes);
      currentStep++;
      await job.progress(100);
      this.logger.debug(`Completed draws sync (${currentStep}/${totalSteps})`);

      this.logger.log(`Completed tournament structure sync job: ${job.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process tournament structure sync: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  @Process(SyncJobType.TOURNAMENT_GAME_SYNC)
  async processTournamentGameSync(job: Job<GameSyncJobData>): Promise<void> {
    this.logger.log(`Processing tournament game sync job: ${job.id}`);

    try {
      const { tournamentCode, eventCode, drawCode, matchCodes, date } = job.data;

      // Initialize progress
      await job.progress(0);

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

      this.logger.log(`Found ${matches.length} matches to process`);

      // Update progress after collecting all matches
      if (matches.length === 0) {
        await job.progress(100);
        this.logger.log(`No matches to process for job: ${job.id}`);
        return;
      }

      // Process matches with progress tracking
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        await this.processMatch(tournamentCode, match, false); // false = isCompetition
        
        // Update progress: calculate percentage completed
        const progressPercentage = Math.round(((i + 1) / matches.length) * 100);
        await job.progress(progressPercentage);
        
        this.logger.debug(`Processed match ${i + 1}/${matches.length} (${progressPercentage}%): ${match.Code}`);
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

    // Check if event already exists
    const existingEvent = await TournamentSubEvent.findOne({
      where: { visualCode: event.Code },
    });

    if (existingEvent) {
      existingEvent.name = event.Name;
      existingEvent.eventType = this.mapGenderType(event.GenderID);
      existingEvent.gameType = this.mapGameType(event.GameTypeID);
      existingEvent.level = event.LevelID;
      await existingEvent.save();
    } else {
      const newEvent = new TournamentSubEvent();
      newEvent.name = event.Name;
      newEvent.eventType = this.mapGenderType(event.GenderID);
      newEvent.gameType = this.mapGameType(event.GameTypeID);
      newEvent.level = event.LevelID;
      newEvent.visualCode = event.Code;
      await newEvent.save();
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

    // For tournament entries, we may not need to store them separately
    // as they are mainly for tournament structure information
    // The actual player participation is captured through games/matches
  }

  private async createOrUpdatePlayer(player: any): Promise<void> {
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

    // Check if draw already exists
    const existingDraw = await TournamentDrawModel.findOne({
      where: { visualCode: draw.Code },
    });

    if (existingDraw) {
      existingDraw.name = draw.Name;
      existingDraw.type = this.mapDrawType(draw.TypeID);
      existingDraw.size = draw.Size;
      await existingDraw.save();
    } else {
      const newDraw = new TournamentDrawModel();
      newDraw.name = draw.Name;
      newDraw.type = this.mapDrawType(draw.TypeID);
      newDraw.size = draw.Size;
      newDraw.visualCode = draw.Code;
      newDraw.risers = 0;
      newDraw.fallers = 0;
      await newDraw.save();
    }
  }

  private async processMatch(tournamentCode: string, match: Match, isCompetition: boolean): Promise<void> {
    this.logger.debug(`Processing tournament match: ${match.Code} - ${match.EventName}`);

    // Check if game already exists
    const existingGame = await Game.findOne({
      where: { visualCode: match.Code },
    });

    if (existingGame) {
      existingGame.playedAt = match.MatchTime ? new Date(match.MatchTime) : undefined;
      existingGame.gameType = this.mapGameTypeToEnum(match.EventName);
      existingGame.status = this.mapMatchStatus(match.ScoreStatus.toString());
      existingGame.winner = match.Winner;
      existingGame.round = match.RoundName;
      existingGame.set1Team1 = match.Sets?.Set?.[0]?.Team1;
      existingGame.set1Team2 = match.Sets?.Set?.[0]?.Team2;
      existingGame.set2Team1 = match.Sets?.Set?.[1]?.Team1;
      existingGame.set2Team2 = match.Sets?.Set?.[1]?.Team2;
      existingGame.set3Team1 = match.Sets?.Set?.[2]?.Team1;
      existingGame.set3Team2 = match.Sets?.Set?.[2]?.Team2;
      await existingGame.save();
    } else {
      const newGame = new Game();
      newGame.playedAt = match.MatchTime ? new Date(match.MatchTime) : undefined;
      newGame.gameType = this.mapGameTypeToEnum(match.EventName);
      newGame.status = this.mapMatchStatus(match.ScoreStatus.toString());
      newGame.winner = match.Winner;
      newGame.round = match.RoundName;
      newGame.linkType = isCompetition ? 'competition' : 'tournament';
      newGame.visualCode = match.Code;
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

  // Helper methods for mapping
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

  private mapGameTypeToEnum(eventName: string): GameType {
    if (eventName?.toLowerCase().includes('single')) return GameType.S;
    if (eventName?.toLowerCase().includes('double')) return GameType.D;
    if (eventName?.toLowerCase().includes('mixed')) return GameType.MX;
    return GameType.S; // Default to singles
  }

  private mapMatchStatus(scoreStatus: string): GameStatus {
    switch (scoreStatus?.toLowerCase()) {
      case 'played':
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
}
