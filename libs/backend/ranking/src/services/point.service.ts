import { Game, GamePlayerMembership, RankingPoint, RankingSystem } from '@app/models';
import { GameStatus, GameType } from '@app/models-enum';
import { getRankingProtected } from '../utils';
import { Injectable } from '@nestjs/common';

/** Represents a player with their membership info for point calculation */
interface GamePlayerInfo {
  playerId: string;
  team: number;
  player: number;
  single?: number;
  double?: number;
  mix?: number;
}

/** Result of point calculation for all players in a game */
interface PointCalculationResult {
  player1Team1Points: number | null;
  player2Team1Points: number | null;
  player1Team2Points: number | null;
  player2Team2Points: number | null;
  differenceInLevel: number;
}

/**
 * Service for calculating and creating ranking points from games
 */
@Injectable()
export class PointService {
  /**
   * Creates ranking points for all players in a game based on the ranking system.
   * Updates existing ranking points if they already exist for the game/system/player.
   *
   * @param system The ranking system to use for calculations
   * @param game The game to calculate points for (must have gamePlayerMemberships loaded)
   * @returns Array of created or updated ranking points
   */
  async createRankingPointForGame(system: RankingSystem, game: Game): Promise<RankingPoint[]> {
    const rankings: RankingPoint[] = [];

    // Ignore ties, not played, or cancelled games
    if (game.winner === 0 || game.winner === 7 || game.winner === 6) {
      return [];
    }

    // Ignore walkovers or games without scores
    if (
      game.status === GameStatus.WALKOVER ||
      ((game.set1Team1 ?? null) === null && (game.set1Team2 ?? null) === null)
    ) {
      return [];
    }

    // Validate that gamePlayerMemberships are loaded
    const memberships = game.gamePlayerMemberships;
    if (!memberships || memberships.length === 0) {
      return [];
    }

    // Extract player info from memberships
    const players = this.extractPlayersFromMemberships(memberships);
    const player1Team1 = players.find((p) => p.team === 1 && p.player === 1);
    const player2Team1 = players.find((p) => p.team === 1 && p.player === 2);
    const player1Team2 = players.find((p) => p.team === 2 && p.player === 1);
    const player2Team2 = players.find((p) => p.team === 2 && p.player === 2);

    const {
      player1Team1Points,
      player2Team1Points,
      player1Team2Points,
      player2Team2Points,
      differenceInLevel,
    } = this.calculatePointsForGame(game, player1Team1, player1Team2, player2Team1, player2Team2, system);

    // Create ranking points for each player
    this.addRankingPoint(rankings, player1Team1, player1Team1Points, system, game, differenceInLevel);
    this.addRankingPoint(rankings, player1Team2, player1Team2Points, system, game, differenceInLevel);
    this.addRankingPoint(rankings, player2Team1, player2Team1Points, system, game, differenceInLevel);
    this.addRankingPoint(rankings, player2Team2, player2Team2Points, system, game, differenceInLevel);

    if (rankings.length > 0) {
      await this.saveRankingPoints(rankings, game, system);
    }

    return rankings;
  }

  /**
   * Saves ranking points, updating existing ones or creating new ones
   */
  private async saveRankingPoints(
    rankings: RankingPoint[],
    game: Game,
    system: RankingSystem
  ): Promise<void> {
    const existingPoints = await RankingPoint.find({
      where: {
        gameId: game.id,
        systemId: system.id,
      },
    });

    for (const ranking of rankings) {
      const existing = existingPoints.find((p) => p.playerId === ranking.playerId);
      if (existing) {
        if (
          existing.points !== ranking.points ||
          existing.differenceInLevel !== ranking.differenceInLevel
        ) {
          existing.points = ranking.points;
          existing.differenceInLevel = ranking.differenceInLevel;
          await existing.save();
        }
      } else {
        await ranking.save();
      }
    }
  }

  /**
   * Extracts player information from game player memberships
   */
  private extractPlayersFromMemberships(memberships: GamePlayerMembership[]): GamePlayerInfo[] {
    return memberships.map((m) => ({
      playerId: m.playerId,
      team: m.team ?? 0,
      player: m.player ?? 0,
      single: m.single,
      double: m.double,
      mix: m.mix,
    }));
  }

  /**
   * Adds a ranking point to the rankings array if player and points are valid
   */
  private addRankingPoint(
    rankings: RankingPoint[],
    player: GamePlayerInfo | undefined,
    points: number | null,
    system: RankingSystem,
    game: Game,
    differenceInLevel: number
  ): void {
    if (player?.playerId && points != null) {
      const rankingPoint = new RankingPoint();
      rankingPoint.points = points;
      rankingPoint.systemId = system.id;
      rankingPoint.playerId = player.playerId;
      rankingPoint.gameId = game.id;
      rankingPoint.rankingDate = game.playedAt;
      rankingPoint.differenceInLevel = points === 0 ? differenceInLevel : 0;
      rankings.push(rankingPoint);
    }
  }

  /**
   * Calculates points for each player in a game based on the ranking system
   */
  private calculatePointsForGame(
    game: Game,
    player1Team1: GamePlayerInfo | undefined,
    player1Team2: GamePlayerInfo | undefined,
    player2Team1: GamePlayerInfo | undefined,
    player2Team2: GamePlayerInfo | undefined,
    system: RankingSystem
  ): PointCalculationResult {
    const points: PointCalculationResult = {
      player1Team1Points: null,
      player2Team1Points: null,
      player1Team2Points: null,
      player2Team2Points: null,
      differenceInLevel: 0,
    };

    const defaultLevel = system.amountOfLevels ?? 12;
    let levelP1T1 = defaultLevel;
    let levelP2T1 = defaultLevel;
    let levelP1T2 = defaultLevel;
    let levelP2T2 = defaultLevel;

    // Get protected rankings using membership data directly
    const rankingPlayer1Team1 = getRankingProtected(
      {
        single: player1Team1?.single,
        mix: player1Team1?.mix,
        double: player1Team1?.double,
      },
      system
    );
    const rankingPlayer2Team1 = getRankingProtected(
      {
        single: player2Team1?.single,
        mix: player2Team1?.mix,
        double: player2Team1?.double,
      },
      system
    );
    const rankingPlayer1Team2 = getRankingProtected(
      {
        single: player1Team2?.single,
        mix: player1Team2?.mix,
        double: player1Team2?.double,
      },
      system
    );
    const rankingPlayer2Team2 = getRankingProtected(
      {
        single: player2Team2?.single,
        mix: player2Team2?.mix,
        double: player2Team2?.double,
      },
      system
    );

    const pointsFrom = this.getPointsFromGameType(game.gameType);
    if (pointsFrom === undefined) {
      throw new Error('No pointsFrom');
    }

    if (rankingPlayer1Team2) {
      levelP1T2 = parseInt(`${rankingPlayer1Team2[pointsFrom] ?? defaultLevel}`, 10);
    }
    if (rankingPlayer2Team2) {
      levelP2T2 = parseInt(`${rankingPlayer2Team2[pointsFrom] ?? defaultLevel}`, 10);
    }
    if (rankingPlayer1Team1) {
      levelP1T1 = parseInt(`${rankingPlayer1Team1[pointsFrom] ?? defaultLevel}`, 10);
    }
    if (rankingPlayer2Team1) {
      levelP2T1 = parseInt(`${rankingPlayer2Team1[pointsFrom] ?? defaultLevel}`, 10);
    }

    if (game.gameType === GameType.S) {
      this.calculateSinglesPoints(points, game, levelP1T1, levelP1T2, system);
    } else {
      this.calculateDoublesPoints(points, game, levelP1T1, levelP2T1, levelP1T2, levelP2T2, system);
    }

    return points;
  }

  /**
   * Gets the ranking type to use based on game type
   */
  private getPointsFromGameType(gameType?: GameType): 'single' | 'double' | 'mix' | undefined {
    switch (gameType) {
      case GameType.S:
        return 'single';
      case GameType.D:
        return 'double';
      case GameType.MX:
        return 'mix';
      default:
        return undefined;
    }
  }

  /**
   * Calculates points for singles games
   */
  private calculateSinglesPoints(
    points: PointCalculationResult,
    game: Game,
    levelP1T1: number,
    levelP1T2: number,
    system: RankingSystem
  ): void {
    if (game.winner === 1) {
      points.player1Team1Points = this.getWinningPoints(system, levelP1T2);
      points.player1Team2Points = 0;
      points.differenceInLevel = levelP1T1 - levelP1T2;
    } else {
      points.player1Team2Points = this.getWinningPoints(system, levelP1T1);
      points.player1Team1Points = 0;
      points.differenceInLevel = levelP1T2 - levelP1T1;
    }
  }

  /**
   * Calculates points for doubles/mixed games
   */
  private calculateDoublesPoints(
    points: PointCalculationResult,
    game: Game,
    levelP1T1: number,
    levelP2T1: number,
    levelP1T2: number,
    levelP2T2: number,
    system: RankingSystem
  ): void {
    if (game.winner === 1) {
      const wonPoints = Math.round(
        (this.getWinningPoints(system, levelP1T2) + this.getWinningPoints(system, levelP2T2)) / 2
      );
      points.player1Team1Points = wonPoints;
      points.player2Team1Points = wonPoints;
      points.player1Team2Points = 0;
      points.player2Team2Points = 0;
      points.differenceInLevel = (levelP1T1 + levelP2T1 - (levelP1T2 + levelP2T2)) / 2;
    } else {
      const wonPoints = Math.round(
        (this.getWinningPoints(system, levelP1T1) + this.getWinningPoints(system, levelP2T1)) / 2
      );
      points.player1Team2Points = wonPoints;
      points.player2Team2Points = wonPoints;
      points.player1Team1Points = 0;
      points.player2Team1Points = 0;
      points.differenceInLevel = (levelP1T2 + levelP2T2 - (levelP1T1 + levelP2T1)) / 2;
    }
  }

  /**
   * Gets the points awarded when winning against a player at the given level
   */
  private getWinningPoints(system: RankingSystem, level: number): number {
    const pointsArray = system.pointsWhenWinningAgainst ?? [];
    const index = pointsArray.length - level;
    return Math.round(pointsArray[index] ?? 0);
  }
}
