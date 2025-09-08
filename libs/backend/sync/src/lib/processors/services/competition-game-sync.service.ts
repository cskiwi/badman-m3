import { TournamentApiClient, Match, Player as TournamentPlayer } from '@app/backend-tournament-api';
import { Game, Player } from '@app/models';
import { GameStatus, GameType } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { Job, WaitingChildrenError } from 'bullmq';
import { GameSyncJobData } from '../../queues/sync.queue';
import { CompetitionPlanningService } from './competition-planning.service';

@Injectable()
export class CompetitionGameSyncService {
  private readonly logger = new Logger(CompetitionGameSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly competitionPlanningService: CompetitionPlanningService,
  ) {}

  async processGameSync(
    data: GameSyncJobData,
    updateProgress: (progress: number) => Promise<void>,
    job?: Job,
    token?: string,
  ): Promise<void> {
    this.logger.log(`Processing competition game sync`);

    try {
      const { tournamentCode, drawCode, matchCodes, date } = data;

      // Initialize progress
      await updateProgress(0);

      let matches: Match[] = [];

      if (matchCodes && matchCodes.length > 0) {
        // Sync specific matches
        for (const matchCode of matchCodes) {
          try {
            const match = await this.tournamentApiClient.getTeamMatch(tournamentCode, matchCode);
            matches.push(match);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`Failed to get match ${matchCode}: ${errorMessage}`, error);
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
          } catch {
            this.logger.debug(`No matches found for date ${dateStr}`);
          }
        }
      }

      this.logger.log(`Found ${matches.length} matches to process`);

      // Update progress after collecting all matches
      if (matches.length === 0) {
        this.logger.log(`No matches to process`);
        return;
      }

      // Process matches with progress tracking
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        await this.processMatch(tournamentCode, match, true); // true = isCompetition

        const finalProgress = this.competitionPlanningService.calculateProgress(i + 1, matches.length, true);
        await updateProgress(finalProgress);

        this.logger.debug(`Processed match ${i + 1}/${matches.length} (${finalProgress}%): ${match.Code}`);
      }

      // Check if we should wait for children using BullMQ pattern
      if (job && token) {
        const shouldWait = await job.moveToWaitingChildren(token);
        if (shouldWait) {
          this.logger.log(`Competition game sync waiting for child jobs`);
          throw new WaitingChildrenError();
        }
      }

      this.logger.log(`Completed competition game sync - processed ${matches.length} matches`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process competition game sync: ${errorMessage}`, errorStack);
      throw error;
    }
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

  private async createOrUpdatePlayer(player: TournamentPlayer): Promise<void> {
    this.logger.debug(`Creating/updating player: ${player.Firstname} ${player.Lastname} (${player.MemberID})`);

    // Check if player already exists
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
