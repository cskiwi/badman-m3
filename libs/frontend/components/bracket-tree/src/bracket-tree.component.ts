
import { Component, computed, input } from '@angular/core';
import { Game } from '@app/models';

// Extended game type with bracket ordering information
export type BracketGame = Game & { bracketOrder: number };

export interface BracketRound {
  name: string;
  games: BracketGame[];
}

@Component({
  standalone: true,
  selector: 'app-bracket-tree',
  imports: [],
  templateUrl: './bracket-tree.component.html',
})
export class BracketTree {
  /**
   * Games data for bracket mode
   */
  readonly games = input<Game[]>([]);

  /**
   * Gap between columns
   */
  readonly columnGap = input<number>(40);

  /**
   * Width for match boxes in pixels
   */
  readonly matchBoxWidth = computed(() => {
    return 220;
  });

  /**
   * Height for match boxes in pixels
   */
  readonly matchBoxHeight = computed(() => {
    return 80;
  });

  readonly columnWidth = computed(() => {
    return this.matchBoxWidth();
  });

  readonly connectorLength = computed(() => {
    return this.columnGap() / 2;
  });

  // Transform games into round-based structure for horizontal bracket display
  bracketRounds = computed<BracketRound[] | null>(() => {
    const gamesList = this.games();
    if (!gamesList || gamesList.length === 0) return null;

    // Group games by round
    const roundsMap = new Map<string, Game[]>();

    gamesList.forEach((game) => {
      const roundName = this.extractRoundName(game);
      if (!roundsMap.has(roundName)) {
        roundsMap.set(roundName, []);
      }
      roundsMap.get(roundName)?.push(game);
    });

    // Get all round keys and sort them dynamically by tournament progression
    // (larger round numbers = earlier in tournament, special rounds at the end)
    const roundKeys = Array.from(roundsMap.keys()).sort((a, b) => {
      const orderA = this.getRoundSortOrder(a);
      const orderB = this.getRoundSortOrder(b);
      return orderA - orderB;
    });

    if (roundKeys.length === 0) return null;

    // Calculate bracket orders by tracing player progression from final backwards
    const bracketOrders = this.calculateBracketOrders(roundKeys, roundsMap);

    // Build the result with sorted games
    const result: BracketRound[] = roundKeys.map((roundKey) => {
      const roundGames = roundsMap.get(roundKey) || [];

      // Create new BracketGame objects with bracket order (don't mutate original objects)
      const bracketGames: BracketGame[] = roundGames.map((game) => {
        return {
          ...game,
          bracketOrder: bracketOrders.get(game.id) ?? 999,
        } as BracketGame;
      });

      // Sort by bracket order
      bracketGames.sort((a, b) => a.bracketOrder - b.bracketOrder);

      return {
        name: this.formatRoundName(roundKey),
        games: bracketGames,
      };
    });

    return result;
  });

  spacing = computed(() => {
    const rounds = this.bracketRounds();
    const spacing: number[] = [];
    for (let i = 0; i < (rounds?.length || 0); i++) {
      spacing.push(this.getMatchSpacing(i));
    }

    return spacing;
  });

  private extractRoundName(game: Game): string {
    // Extract round info from the game's round property
    return game.round || 'Unknown';
  }

  /**
   * Calculate bracket order for each game by tracing player progression from the final backwards.
   * Returns a Map of gameId -> bracketOrder
   *
   * Algorithm:
   * 1. Start from the final round (fewest games)
   * 2. Assign bracketOrder 0 to final game(s)
   * 3. Go backwards through rounds
   * 4. For each game in the current round (sorted by bracketOrder):
   *    - Look at team 1 players, find the game in previous round where one of them won
   *    - Assign that game bracketOrder = parentOrder * 2
   *    - Look at team 2 players, find the game in previous round where one of them won
   *    - Assign that game bracketOrder = parentOrder * 2 + 1
   */
  private calculateBracketOrders(roundKeys: string[], roundsMap: Map<string, Game[]>): Map<string, number> {
    const bracketOrders = new Map<string, number>();

    if (roundKeys.length === 0) return bracketOrders;

    // Start from the final round (last in the sorted array = fewest games)
    const finalRoundKey = roundKeys[roundKeys.length - 1];
    const finalRoundGames = roundsMap.get(finalRoundKey) || [];

    // Assign order 0 to final game(s)
    finalRoundGames.forEach((game, index) => {
      bracketOrders.set(game.id, index);
    });

    // Work backwards through rounds (from final towards earlier rounds)
    for (let roundIdx = roundKeys.length - 1; roundIdx > 0; roundIdx--) {
      const currentRoundKey = roundKeys[roundIdx];
      const previousRoundKey = roundKeys[roundIdx - 1];

      const currentRoundGames = roundsMap.get(currentRoundKey) || [];
      const previousRoundGames = roundsMap.get(previousRoundKey) || [];

      // Sort current round games by their bracket order (top to bottom)
      const sortedCurrentGames = [...currentRoundGames].sort((a, b) => {
        const orderA = bracketOrders.get(a.id) ?? 999;
        const orderB = bracketOrders.get(b.id) ?? 999;
        return orderA - orderB;
      });

      // Track which games in the previous round have been assigned
      const assignedGameIds = new Set<string>();

      // For each game in the current round, find feeder games from previous round
      for (const currentGame of sortedCurrentGames) {
        const currentOrder = bracketOrders.get(currentGame.id) ?? 0;

        // Get players for team 1 and team 2 in the current game
        const team1PlayerIds = this.getPlayerIdsByTeam(currentGame, 1);
        const team2PlayerIds = this.getPlayerIdsByTeam(currentGame, 2);

        // Find the game in previous round where team 1's player(s) won
        const team1FeederGame = this.findFeederGame(previousRoundGames, team1PlayerIds, assignedGameIds);

        // Find the game in previous round where team 2's player(s) won
        const team2FeederGame = this.findFeederGame(previousRoundGames, team2PlayerIds, assignedGameIds);

        // Assign bracket orders: team 1 feeder gets even, team 2 feeder gets odd
        if (team1FeederGame) {
          bracketOrders.set(team1FeederGame.id, currentOrder * 2);
          assignedGameIds.add(team1FeederGame.id);
        }

        if (team2FeederGame) {
          bracketOrders.set(team2FeederGame.id, currentOrder * 2 + 1);
          assignedGameIds.add(team2FeederGame.id);
        }
      }

      // Assign orders to any remaining unassigned games in previous round
      let nextOrder = previousRoundGames.length;
      for (const game of previousRoundGames) {
        if (!bracketOrders.has(game.id)) {
          bracketOrders.set(game.id, nextOrder++);
        }
      }
    }

    return bracketOrders;
  }

  /**
   * Find the game in a round where one of the given player IDs won
   */
  private findFeederGame(roundGames: Game[], playerIds: string[], excludeGameIds: Set<string>): Game | null {
    for (const game of roundGames) {
      if (excludeGameIds.has(game.id)) continue;

      const winnerPlayerIds = this.getWinnerPlayerIds(game);

      // Check if any of the target players won this game
      if (winnerPlayerIds.some((winnerId) => playerIds.includes(winnerId))) {
        return game;
      }
    }

    return null;
  }

  private formatRoundName(roundKey: string): string {
    // Handle "Rxx" format dynamically (e.g., R256, R128, R64, R32, R16, R8, R4, R2)
    if (/^R\d+$/i.test(roundKey)) {
      const number = parseInt(roundKey.substring(1), 10);
      // R2 is the final, R4 is semi-final, R8 is quarter-final
      if (number === 2) return 'Final';
      if (number === 4) return 'Semi Final';
      if (number === 8) return 'Quarter Final';
      return `Round of ${number}`;
    }

    // Handle special named rounds
    const upperKey = roundKey.toUpperCase();
    if (upperKey === 'QF' || upperKey === 'QUARTERFINAL' || upperKey === 'QUARTER-FINAL') {
      return 'Quarter Final';
    }
    if (upperKey === 'SF' || upperKey === 'SEMIFINAL' || upperKey === 'SEMI-FINAL') {
      return 'Semi Final';
    }
    if (upperKey === 'FINAL' || upperKey === 'F') {
      return 'Final';
    }

    return roundKey;
  }

  /**
   * Get a numeric sort order for a round key.
   * Lower numbers = earlier in tournament (more games), higher = later (fewer games).
   * This allows dynamic sorting of any round format.
   */
  private getRoundSortOrder(roundKey: string): number {
    // Handle "Rxx" format - larger numbers come first (R256 before R128 before R64, etc.)
    if (/^R\d+$/i.test(roundKey)) {
      const number = parseInt(roundKey.substring(1), 10);
      // Invert so larger numbers get lower sort order (come first)
      // Use a large base to ensure Rxx rounds sort before special rounds
      return 10000 - number;
    }

    // Handle special named rounds - these come after Rxx rounds
    const upperKey = roundKey.toUpperCase();

    // Quarter Final = 8 remaining, Semi Final = 4 remaining, Final = 2 remaining
    if (upperKey === 'QF' || upperKey === 'QUARTERFINAL' || upperKey === 'QUARTER-FINAL') {
      return 10000 - 8; // Same as R8
    }
    if (upperKey === 'SF' || upperKey === 'SEMIFINAL' || upperKey === 'SEMI-FINAL') {
      return 10000 - 4; // Same as R4
    }
    if (upperKey === 'FINAL' || upperKey === 'F') {
      return 10000 - 2; // Same as R2
    }

    // Unknown rounds go to the very end
    return 99999;
  }

  getTeamName(game: Game, teamNumber: 1 | 2): string {
    if (!game.gamePlayerMemberships || game.gamePlayerMemberships.length === 0) {
      return '';
    }

    const teamMembers = game.gamePlayerMemberships.filter((m) => m.team === teamNumber);

    if (teamMembers.length === 0) {
      return '';
    }

    const names = teamMembers
      .map((membership) => {
        // Try to get the player name in various ways
        const player = membership.gamePlayer;
        if (!player) {
          return `Player ${membership.playerId?.slice(-6) || 'Unknown'}`;
        }

        // Preferred: use fullName property (getter in Player model)
        if (player.fullName && player.fullName.trim()) {
          return player.fullName.trim();
        }

        // Fallback: construct from firstName and lastName
        if (player.firstName || player.lastName) {
          const firstName = player.firstName?.trim() || '';
          const lastName = player.lastName?.trim() || '';
          const constructedName = `${firstName} ${lastName}`.trim();
          if (constructedName) {
            return constructedName;
          }
        }

        // Last resort: use player ID
        return `Player ${membership.playerId?.slice(-6) || 'Unknown'}`;
      })
      .filter((name) => name && name !== '');

    return names.length > 0 ? names.join(' / ') : '';
  }

  getTeamScore(game: Game, teamNumber: 1 | 2): string {
    const sets: string[] = [];

    if (game.set1Team1 !== null && game.set1Team2 !== null) {
      sets.push(teamNumber === 1 ? String(game.set1Team1) : String(game.set1Team2));
    }
    if (game.set2Team1 !== null && game.set2Team2 !== null) {
      sets.push(teamNumber === 1 ? String(game.set2Team1) : String(game.set2Team2));
    }
    if (game.set3Team1 !== null && game.set3Team2 !== null) {
      sets.push(teamNumber === 1 ? String(game.set3Team1) : String(game.set3Team2));
    }

    return sets.join(' ');
  }

  isBye(game: Game): boolean {
    const isScorelessBye =
      game.set1Team1 === null &&
      game.set1Team2 === null &&
      game.set2Team1 === null &&
      game.set2Team2 === null &&
      game.set3Team1 === null &&
      game.set3Team2 === null;

    const isPastGame = game.playedAt ? new Date(game.playedAt) < new Date() : false;

    return isScorelessBye && isPastGame;
  }

  isGameCompleted(game: Game): boolean {
    return game.winner !== null && game.winner !== 0;
  }

  getMatchSpacing(roundIndex: number): number {
    const matchHeight = this.matchBoxHeight();
    const baseSpacing = 20;

    if (roundIndex === 0) return baseSpacing;

    let spacing = baseSpacing;
    for (let i = 1; i <= roundIndex; i++) {
      const prevSpacing = i === 1 ? baseSpacing : spacing;
      spacing = matchHeight + 2 * prevSpacing;
    }

    return spacing;
  }

  getVerticalOffset(roundIndex: number): number {
    if (roundIndex === 0) return 0;

    const matchHeight = this.matchBoxHeight();
    const baseSpacing = 20;

    // Simple formula: offset = (matchHeight + baseSpacing) * (2^roundIndex - 1) / 2
    const offset = ((matchHeight + baseSpacing) * (Math.pow(2, roundIndex) - 1)) / 2;

    return offset;
  }

  shouldDrawVerticalConnector(gameIndex: number, totalGames: number): boolean {
    // Only draw connectors for even-indexed games that have a pair below them
    return gameIndex % 2 === 0 && gameIndex + 1 < totalGames;
  }

  getVerticalConnectorDistance(gameIndex: number, roundIndex: number): number {
    // Distance between current game and the next game in the pair
    return this.matchBoxHeight() + this.spacing()[roundIndex];
  }

  /**
   * Get the player IDs of the winning team from a game
   */
  private getWinnerPlayerIds(game: Game): string[] {
    if (!game.gamePlayerMemberships || game.winner === null || game.winner === 0) {
      // If no winner yet, return all player IDs (game might be a bye or not played)
      return this.getPlayerIdsFromGame(game);
    }

    const winningTeam = game.winner;
    return game.gamePlayerMemberships
      .filter((membership) => membership.team === winningTeam)
      .map((membership) => membership.gamePlayer.id)
      .filter((id): id is string => id != null);
  }

  /**
   * Extract all player IDs from a game's memberships
   */
  private getPlayerIdsFromGame(game: Game): string[] {
    if (!game.gamePlayerMemberships) {
      return [];
    }

    return game.gamePlayerMemberships.map((membership) => membership.playerId).filter((playerId): playerId is string => playerId != null);
  }

  /**
   * Get player IDs for a specific team in a game
   */
  private getPlayerIdsByTeam(game: Game, team: 1 | 2): string[] {
    if (!game.gamePlayerMemberships) {
      return [];
    }

    return game.gamePlayerMemberships
      .filter((membership) => membership.team === team)
      .map((membership) => membership.gamePlayer.id)
      .filter((playerId): playerId is string => playerId != null);
  }
}
