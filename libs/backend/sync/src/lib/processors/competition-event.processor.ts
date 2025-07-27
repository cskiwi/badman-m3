import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Like, IsNull } from 'typeorm';
import { TournamentApiClient, TournamentEvent, Team, TournamentDraw, Match } from '@app/tournament-api';
import { CompetitionSubEvent, Team as TeamModel, Game, Player } from '@app/models';
import { SubEventTypeEnum, GameType, GameStatus } from '@app/model/enums';
import { SYNC_QUEUE, SyncJobType, StructureSyncJobData, GameSyncJobData } from '../queues/sync.queue';
import { SyncService } from '../services/sync.service';

@Injectable()
@Processor(SYNC_QUEUE)
export class CompetitionEventProcessor {
  private readonly logger = new Logger(CompetitionEventProcessor.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly syncService: SyncService,
  ) {}

  @Process(SyncJobType.COMPETITION_STRUCTURE_SYNC)
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

  @Process(SyncJobType.COMPETITION_GAME_SYNC)
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
    this.logger.debug(`Creating/updating competition sub-event: ${event.Name} (${event.Code})`);

    // Check if event already exists
    const existingEvent = await CompetitionSubEvent.findOne({
      where: { name: event.Name },
    });

    if (existingEvent) {
      existingEvent.name = event.Name;
      existingEvent.eventType = this.mapGenderType(event.GenderID);
      existingEvent.level = event.LevelID;
      await existingEvent.save();
    } else {
      const newEvent = new CompetitionSubEvent();
      newEvent.name = event.Name;
      newEvent.eventType = this.mapGenderType(event.GenderID);
      newEvent.level = event.LevelID;
      await newEvent.save();
    }
  }

  private async createOrUpdateTeam(tournamentCode: string, team: Team): Promise<void> {
    // Extract team information for matching
    const normalizedName = this.normalizeTeamName(team.Name);
    const clubName = this.extractClubName(team.Name);
    const teamNumber = this.extractTeamNumber(team.Name);
    const gender = this.extractTeamGender(team.Name);
    const strength = this.extractTeamStrength(team.Name);

    this.logger.debug(`Processing team: ${team.Name} (${team.Code})`);

    // Try to find existing team by normalized name and club
    const existingTeam = await TeamModel.findOne({
      where: {
        name: clubName,
        teamNumber: teamNumber ?? IsNull(),
      },
      relations: ['club'],
    });

    if (!existingTeam) {
      // Queue for team matching process
      await this.syncService.queueTeamMatching({
        tournamentCode,
        unmatchedTeams: [
          {
            externalCode: team.Code,
            externalName: team.Name,
            normalizedName,
            clubName,
            teamNumber: teamNumber ?? undefined,
            gender: gender ?? undefined,
            strength: strength ?? undefined,
          },
        ],
      });

      this.logger.debug(`Queued team for matching: ${team.Name}`);
    } else {
      this.logger.debug(`Found existing team: ${existingTeam.name} for ${team.Name}`);
    }
  }

  private async createOrUpdateDraw(tournamentCode: string, eventCode: string, draw: TournamentDraw): Promise<void> {
    // For competitions, draws are typically represented as groups/divisions
    // This is more about structure than actual draws in tournaments

    this.logger.debug(`Processing competition draw/group: ${draw.Name} (${draw.Code})`);

    // Competition draws are handled differently - they're more like divisions/groups
    // For now, we'll log this but not create separate entities as the structure
    // is captured in the encounter/match relationships
  }

  private async processMatch(tournamentCode: string, match: Match, isCompetition: boolean): Promise<void> {
    this.logger.debug(`Processing match: ${match.Code} - ${match.EventName}`);

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

    // Ensure players exist in our system for team matches
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

  // Helper methods for mapping and extraction
  private mapGenderType(genderId: number): SubEventTypeEnum {
    switch (genderId) {
      case 1:
        return SubEventTypeEnum.M;
      case 2:
        return SubEventTypeEnum.F;
      case 3:
        return SubEventTypeEnum.MX;
      default:
        return SubEventTypeEnum.M;
    }
  }

  private mapGameType(gameTypeId: number): string {
    switch (gameTypeId) {
      case 1:
        return 'singles';
      case 2:
        return 'doubles';
      default:
        return 'unknown';
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
        return 'POULE'; // Default to round-robin for competitions
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

  private async createOrUpdatePlayer(player: any): Promise<void> {
    this.logger.debug(`Creating/updating player: ${player.Firstname} ${player.Lastname} (${player.MemberID})`);

    // Check if player already exists
    const existingPlayer = await Player.findOne({
      where: { memberId: player.MemberID },
    });

    if (existingPlayer) {
      existingPlayer.firstName = player.Firstname;
      existingPlayer.lastName = player.Lastname;
      existingPlayer.gender =
        this.mapGenderType(player.GenderID) === SubEventTypeEnum.M ? 'M' : this.mapGenderType(player.GenderID) === SubEventTypeEnum.F ? 'F' : 'M';
      existingPlayer.competitionPlayer = true;
      await existingPlayer.save();
    } else {
      const newPlayer = new Player();
      newPlayer.memberId = player.MemberID;
      newPlayer.firstName = player.Firstname;
      newPlayer.lastName = player.Lastname;
      newPlayer.gender =
        this.mapGenderType(player.GenderID) === SubEventTypeEnum.M ? 'M' : this.mapGenderType(player.GenderID) === SubEventTypeEnum.F ? 'F' : 'M';
      newPlayer.competitionPlayer = true;
      await newPlayer.save();
    }
  }

  private normalizeTeamName(name: string): string {
    return name
      .toLowerCase()
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
        case 'H':
          return 'men';
        case 'D':
          return 'women';
        case 'G':
          return 'mixed';
      }
    }
    return null;
  }

  private extractTeamStrength(name: string): number | null {
    const match = name.match(/\((\d+)\)$/);
    return match ? parseInt(match[1], 10) : null;
  }
}
