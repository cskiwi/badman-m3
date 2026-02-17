import { PointService, getRankingProtected } from '@app/backend-ranking';
import { TournamentApiClient, Match, Player as TournamentPlayer, ScoreStatus } from '@app/backend-tournament-api';
import { Game, Player, GamePlayerMembership, RankingSystem, RankingPlace, RankingPoint, TournamentDraw as TournamentDrawModel } from '@app/models';
import { GameStatus, GameType } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { TournamentPlanningService } from './tournament-planning.service';
import { Job } from 'bullmq';
import { LessThanOrEqual } from 'typeorm';

export interface TournamentGameSyncOptions {
  drawId: string; // Required internal ID
  matchCodes?: string[];
  metadata?: any; // JobDisplayMetadata from queue
}

@Injectable()
export class TournamentGameSyncService {
  private readonly logger = new Logger(TournamentGameSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly tournamentPlanningService: TournamentPlanningService,
    private readonly pointService: PointService,
  ) {}

  async processGameSync(job: Job<TournamentGameSyncOptions>, updateProgress: (progress: number) => Promise<void>): Promise<void> {
    try {
      const { drawId, matchCodes } = job.data;

      // Initialize progress
      await updateProgress(0);

      // Step 1: Load the draw by internal ID
      const draw = await TournamentDrawModel.findOne({
        where: { id: drawId },
        relations: ['tournamentSubEvent', 'tournamentSubEvent.tournamentEvent'],
      });

      if (!draw) {
        throw new Error(`Tournament draw with id ${drawId} not found`);
      }

      const subEvent = draw.tournamentSubEvent;
      if (!subEvent) {
        throw new Error(`Sub-event not found for draw ${drawId}`);
      }

      const tournamentEvent = subEvent.tournamentEvent;
      if (!tournamentEvent) {
        throw new Error(`Tournament event not found for draw ${drawId}`);
      }

      const tournamentCode = tournamentEvent.visualCode;
      const drawCode = draw.visualCode;
      if (!tournamentCode) {
        throw new Error(`Tournament event ${tournamentEvent.id} has no visual code`);
      }
      if (!drawCode) {
        throw new Error(`Draw ${drawId} has no visual code`);
      }
      this.logger.log(`Loaded draw: ${draw.name} (${drawCode}) for tournament ${tournamentCode}`);

      await updateProgress(10);

      const matches = await this.collectMatches(tournamentCode, drawCode, matchCodes);

      this.logger.log(`Found ${matches.length} matches to process`);

      if (matches.length === 0) {
        this.logger.log(`No matches to process`);
        await updateProgress(100);
        return;
      }

      // Process matches with progress tracking
      await this.processMatches(matches, tournamentCode, updateProgress, drawId, subEvent?.gameType, tournamentEvent.official);

      this.logger.log(`Completed tournament game sync - processed ${matches.length} matches`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process tournament game sync: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  private async collectMatches(tournamentCode: string | undefined, drawCode: string | undefined, matchCodes?: string[]): Promise<Match[]> {
    let matches: Match[] = [];

    if (!tournamentCode) {
      throw new Error('Tournament code is required for match collection');
    }

    if (matchCodes && matchCodes.length > 0) {
      // Sync specific matches
      matches = await this.getMatchesByCode(tournamentCode, matchCodes);
    } else if (drawCode) {
      // Sync all matches in a draw
      const drawMatches = await this.tournamentApiClient.getMatchesByDraw(tournamentCode, drawCode);
      matches = drawMatches?.filter((match) => match != null) || [];
    }
    return matches;
  }

  private async getMatchesByCode(tournamentCode: string, matchCodes: string[]): Promise<Match[]> {
    const matches: Match[] = [];

    for (const matchCode of matchCodes) {
      try {
        const match = await this.tournamentApiClient.getMatchDetails(tournamentCode, matchCode);
        if (match) {
          matches.push(match);
        } else {
          this.logger.warn(`Match API returned null/undefined for matchCode: ${matchCode}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to get match ${matchCode}: ${errorMessage}`, error);
      }
    }

    return matches;
  }

  private async processMatches(
    matches: Match[],
    tournamentCode: string,
    updateProgress: (progress: number) => Promise<void>,
    drawId?: string,
    gameType?: GameType,
    official?: boolean,
  ): Promise<void> {
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];

      if (!match) {
        this.logger.warn(`Skipping undefined match at index ${i}`);
        continue;
      }

      await this.processMatch(match, drawId, gameType, official);

      const finalProgress = this.tournamentPlanningService.calculateProgress(i + 1, matches.length, true);
      await updateProgress(finalProgress);

      this.logger.debug(`Processed match ${i + 1}/${matches.length} (${finalProgress}%): ${match.Code || 'NO_CODE'}`);
    }
  }

  private async processMatch(match: Match, drawId?: string, gameType?: GameType, official?: boolean): Promise<void> {
    if (!match) {
      this.logger.warn('Received undefined or null match, skipping processing');
      return;
    }

    if (!match.Code) {
      this.logger.warn(`Match missing Code property, skipping: ${JSON.stringify(match)}`);
      return;
    }

    this.logger.debug(`Processing tournament match: ${match.Code} - ${match.EventName}`);

    // Require internal drawId for exact match
    if (!drawId) {
      throw new Error(`drawId is required for tournament game sync (match: ${match.Code})`);
    }

    const linkId = drawId;

    const existingGame = await Game.findOne({
      where: {
        visualCode: match.Code,
        linkId: linkId,
        linkType: 'tournament',
      },
    });

    if (existingGame) {
      existingGame.playedAt = match.MatchTime ? new Date(match.MatchTime) : undefined;
      existingGame.gameType = gameType;
      existingGame.status = this.mapMatchStatus(match);
      existingGame.winner = match.Winner;
      existingGame.round = match.RoundName;

      // Set linkId to the draw ID for tournament games
      if (linkId) {
        existingGame.linkId = linkId;
      }

      existingGame.set1Team1 = parseInt(match.Sets?.Set?.[0]?.Team1 || '0', 10);
      existingGame.set1Team2 = parseInt(match.Sets?.Set?.[0]?.Team2 || '0', 10);
      existingGame.set2Team1 = parseInt(match.Sets?.Set?.[1]?.Team1 || '0', 10);
      existingGame.set2Team2 = parseInt(match.Sets?.Set?.[1]?.Team2 || '0', 10);
      existingGame.set3Team1 = parseInt(match.Sets?.Set?.[2]?.Team1 || '0', 10);
      existingGame.set3Team2 = parseInt(match.Sets?.Set?.[2]?.Team2 || '0', 10);
      await existingGame.save();
    } else {
      const newGame = new Game();
      newGame.playedAt = match.MatchTime ? new Date(match.MatchTime) : undefined;
      newGame.gameType = gameType;
      newGame.status = this.mapMatchStatus(match);
      newGame.winner = match.Winner;
      newGame.round = match.RoundName;
      newGame.linkType = 'tournament';
      newGame.visualCode = match.Code;

      // Set linkId to the draw ID for tournament games
      if (linkId) {
        newGame.linkId = linkId;
      }

      newGame.set1Team1 = parseInt(match.Sets?.Set?.[0]?.Team1 || '0', 10);
      newGame.set1Team2 = parseInt(match.Sets?.Set?.[0]?.Team2 || '0', 10);
      newGame.set2Team1 = parseInt(match.Sets?.Set?.[1]?.Team1 || '0', 10);
      newGame.set2Team2 = parseInt(match.Sets?.Set?.[1]?.Team2 || '0', 10);
      newGame.set3Team1 = parseInt(match.Sets?.Set?.[2]?.Team1 || '0', 10);
      newGame.set3Team2 = parseInt(match.Sets?.Set?.[2]?.Team2 || '0', 10);
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

    // Create game player memberships
    const game =
      existingGame ||
      (await Game.findOne({
        where: {
          visualCode: match.Code,
          linkId: linkId,
          linkType: 'tournament',
        },
      }));

    if (game) {
      await this.createGamePlayerMemberships(game, match);
      if (official) {
        await this.createRankingPoints(game);
      } else {
        await this.removeRankingPoints(game);
      }
    }
  }

  /**
   * Create ranking points for a game using the primary ranking system
   */
  private async createRankingPoints(game: Game): Promise<void> {
    try {
      const primarySystem = await RankingSystem.findOne({ where: { primary: true } });
      if (!primarySystem) {
        this.logger.warn('No primary ranking system found, skipping point creation');
        return;
      }

      // Reload game with memberships for point calculation
      const gameWithMemberships = await Game.findOne({
        where: { id: game.id },
        relations: ['gamePlayerMemberships'],
      });

      if (!gameWithMemberships) {
        this.logger.warn(`Game ${game.id} not found when creating ranking points`);
        return;
      }

      await this.pointService.createRankingPointForGame(primarySystem, gameWithMemberships);
      this.logger.debug(`Created ranking points for game ${game.visualCode}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to create ranking points for game ${game.id}: ${errorMessage}`);
      // Don't throw - ranking point creation failure shouldn't block game sync
    }
  }

  /**
   * Remove ranking points for a game when the tournament is not official
   */
  private async removeRankingPoints(game: Game): Promise<void> {
    try {
      const primarySystem = await RankingSystem.findOne({ where: { primary: true } });
      if (!primarySystem) {
        return;
      }

      const existingPoints = await RankingPoint.find({
        where: {
          gameId: game.id,
          systemId: primarySystem.id,
        },
      });

      if (existingPoints.length > 0) {
        await RankingPoint.remove(existingPoints);
        this.logger.log(`Removed ${existingPoints.length} ranking points for non-official tournament game ${game.visualCode}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to remove ranking points for game ${game.id}: ${errorMessage}`);
    }
  }

  private mapMatchStatus(match: Match): GameStatus {
    switch (match.ScoreStatus) {
      case ScoreStatus.Retirement:
        return GameStatus.RETIREMENT;
      case ScoreStatus.Disqualified:
        return GameStatus.DISQUALIFIED;
      case ScoreStatus['No Match']:
        return GameStatus.NO_MATCH;
      case ScoreStatus.Walkover:
        return GameStatus.WALKOVER;
      case ScoreStatus.Normal:
      default:
        // This is the case when the tournament didn't configured their score status
        if (
          // No scores
          match?.Sets?.Set[0]?.Team1 == null &&
          match?.Sets?.Set[0]?.Team2 == null &&
          // But not both players filled
          !(
            match?.Team1?.Player1?.MemberID == null && match?.Team2?.Player1?.MemberID == null
          ) &&
          // And not both players null
          (match?.Team2?.Player1?.MemberID !== null || match?.Team2?.Player2?.MemberID !== null)
        ) {
          return GameStatus.WALKOVER;
        } else {
          return GameStatus.NORMAL;
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

  private mapGenderType(genderId: number | string): string {
    if (typeof genderId === 'string') {
      genderId = parseInt(genderId, 10);
    }

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

  private async createGamePlayerMemberships(game: Game, match: Match): Promise<void> {
    this.logger.debug(`Creating game player memberships for game: ${game.visualCode}`);

    // Helper function to create or update membership for a player
    const createMembershipForPlayer = async (tournamentPlayer: TournamentPlayer, team: number, playerPosition: number): Promise<void> => {
      if (!tournamentPlayer?.MemberID) return;

      const primarySystem = await RankingSystem.findOne({ where: { primary: true } });

      // Find the player in our system
      const player = await Player.findOne({
        where: { memberId: tournamentPlayer.MemberID },
      });

      if (!player) {
        this.logger.warn(`Player not found for memberID: ${tournamentPlayer.MemberID}`);
        return;
      }

      // Find the most recent ranking place for this player that meets the criteria
      const rankingplace = await RankingPlace.findOne({
        where: {
          playerId: player.id,
          rankingDate: LessThanOrEqual(game.playedAt || new Date()),
          systemId: primarySystem!.id,
        },
        order: {
          rankingDate: 'DESC',
        },
      });

      // Check if membership already exists
      const existingMembership = await GamePlayerMembership.findOne({
        where: {
          gameId: game.id,
          playerId: player.id,
        },
      });

      const protectedRanking = getRankingProtected(
        {
          single: rankingplace?.single ?? primarySystem!.amountOfLevels,
          double: rankingplace?.double ?? primarySystem!.amountOfLevels,
          mix: rankingplace?.mix ?? primarySystem!.amountOfLevels,
        },
        primarySystem!,
      );

      if (existingMembership) {
        // Update existing membership
        existingMembership.team = team;
        existingMembership.player = playerPosition;

        existingMembership.single = protectedRanking.single;
        existingMembership.double = protectedRanking.double;
        existingMembership.mix = protectedRanking.mix;

        await existingMembership.save();
        this.logger.debug(`Updated game player membership for player ${player.id} in game ${game.id}`);
      } else {
        // Create new membership
        const membership = new GamePlayerMembership();
        membership.gameId = game.id;
        membership.playerId = player.id;
        membership.team = team;
        membership.player = playerPosition;

        membership.single = protectedRanking.single;
        membership.double = protectedRanking.double;
        membership.mix = protectedRanking.mix;

        await membership.save();
        this.logger.debug(`Created game player membership for player ${player.id} in game ${game.id}`);
      }
    };

    // Create memberships for Team 1 players
    if (match.Team1?.Player1) {
      await createMembershipForPlayer(match.Team1.Player1, 1, 1);
    }
    if (match.Team1?.Player2) {
      await createMembershipForPlayer(match.Team1.Player2, 1, 2);
    }

    // Create memberships for Team 2 players
    if (match.Team2?.Player1) {
      await createMembershipForPlayer(match.Team2.Player1, 2, 1);
    }
    if (match.Team2?.Player2) {
      await createMembershipForPlayer(match.Team2.Player2, 2, 2);
    }
  }
}
