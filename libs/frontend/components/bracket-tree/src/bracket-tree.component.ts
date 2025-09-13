import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { Game } from '@app/models';

@Component({
  standalone: true,
  selector: 'app-bracket-tree',
  imports: [CommonModule],
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
  bracketRounds = computed(() => {
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

    // Define all possible tournament rounds from largest to smallest
    const allPossibleRounds = ['R256', 'R128', 'R64', 'R32', 'R16', 'R8', 'QF', 'SF', 'Final', 'Third'];

    // Filter to only include rounds that actually exist in the data
    const existingRounds = allPossibleRounds.filter((round) => roundsMap.has(round));
    const rounds: { name: string; games: Game[] }[] = [];

    // Sort each round's games by bracket position and arrange by player progression
    existingRounds.forEach((roundKey) => {
      const roundGames = roundsMap.get(roundKey);
      if (!roundGames) return;

      // Sort games within the round by bracket position
      const sortedGames = this.sortGamesByBracketPosition(roundGames);
      
      rounds.push({
        name: this.formatRoundName(roundKey),
        games: sortedGames,
      });
    });

    // Apply player progression logic to ensure winners flow correctly
    return this.arrangeGamesByPlayerProgression(rounds);
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

  private sortGamesByBracketPosition(games: Game[]): Game[] {
    return games.sort((a, b) => {
      // Primary sort: by order field if available (most reliable for bracket position)
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      
      // Secondary sort: by visualCode if available (often contains bracket position info)
      if (a.visualCode && b.visualCode) {
        return a.visualCode.localeCompare(b.visualCode, undefined, { numeric: true, sensitivity: 'base' });
      }
      
      // Tertiary: Try to extract numeric info from game IDs or other identifiers
      const aId = this.extractNumericFromId(a.id);
      const bId = this.extractNumericFromId(b.id);
      if (aId !== null && bId !== null) {
        return aId - bId;
      }
      
      // Fallback: sort by playedAt time (original behavior)
      return new Date(a.playedAt || 0).getTime() - new Date(b.playedAt || 0).getTime();
    });
  }

  private extractNumericFromId(id: string): number | null {
    const match = id.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }

  private formatRoundName(roundKey: string): string {
    switch (roundKey) {
      case 'R256':
        return 'Round of 256';
      case 'R128':
        return 'Round of 128';
      case 'R64':
        return 'Round of 64';
      case 'R32':
        return 'Round of 32';
      case 'R16':
        return 'Round of 16';
      case 'R8':
        return 'Round of 8';
      case 'QF':
        return 'Quarter Final';
      case 'SF':
        return 'Semi Final';
      case 'Final':
        return 'Final';
      default:
        // Handle any Rxx format dynamically
        if (roundKey.startsWith('R') && /^R\d+$/.test(roundKey)) {
          const number = roundKey.substring(1);
          return `Round of ${number}`;
        }
        return roundKey;
    }
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
   * Arrange games by player progression to ensure winners from previous rounds
   * correctly appear in subsequent rounds based on player IDs
   */
  private arrangeGamesByPlayerProgression(rounds: { name: string; games: Game[] }[]): { name: string; games: Game[] }[] | null {
    if (!rounds || rounds.length <= 1) return rounds;

    // Work backwards from the final round to establish player connections
    for (let roundIndex = rounds.length - 1; roundIndex > 0; roundIndex--) {
      const currentRound = rounds[roundIndex];
      const previousRound = rounds[roundIndex - 1];
      
      // For each game in the current round, find the corresponding games in the previous round
      currentRound.games = currentRound.games.map((currentGame, gameIndex) => {
        const correspondingPreviousGames = this.findCorrespondingPreviousGames(
          currentGame, 
          previousRound.games
        );
        
        // If we found corresponding games, use their arrangement to guide current game positioning
        if (correspondingPreviousGames.length > 0) {
          return currentGame; // Keep current game but validate its position
        }
        
        return currentGame;
      });
      
      // Rearrange previous round games based on player connections
      previousRound.games = this.rearrangePreviousRoundGames(
        previousRound.games,
        currentRound.games
      );
    }

    return rounds;
  }

  /**
   * Find games in the previous round that correspond to a current round game
   * based on player IDs that appear in the current game
   */
  private findCorrespondingPreviousGames(currentGame: Game, previousGames: Game[]): Game[] {
    const currentPlayerIds = this.getPlayerIdsFromGame(currentGame);
    
    if (currentPlayerIds.length === 0) {
      return [];
    }

    // Find previous round games that contain any of the current game's players
    const correspondingGames = previousGames.filter(prevGame => {
      const prevPlayerIds = this.getPlayerIdsFromGame(prevGame);
      return prevPlayerIds.some(playerId => currentPlayerIds.includes(playerId));
    });

    return correspondingGames;
  }

  /**
   * Rearrange previous round games to better align with current round player progression
   */
  private rearrangePreviousRoundGames(previousGames: Game[], currentGames: Game[]): Game[] {
    const rearranged = [...previousGames];
    
    // For each current game, try to position its source games optimally in the previous round
    currentGames.forEach((currentGame, currentIndex) => {
      const currentPlayerIds = this.getPlayerIdsFromGame(currentGame);
      
      // Find which previous games feed into this current game
      const sourceGames = previousGames.filter(prevGame => {
        const prevPlayerIds = this.getPlayerIdsFromGame(prevGame);
        return prevPlayerIds.some(playerId => currentPlayerIds.includes(playerId));
      });
      
      // Try to position source games in pairs that feed into the current game
      if (sourceGames.length >= 2) {
        const targetStartIndex = currentIndex * 2;
        
        // Move the source games to the target positions if possible
        sourceGames.slice(0, 2).forEach((sourceGame, sourceIndex) => {
          const currentPos = rearranged.indexOf(sourceGame);
          const targetPos = Math.min(targetStartIndex + sourceIndex, rearranged.length - 1);
          
          if (currentPos !== -1 && targetPos < rearranged.length && currentPos !== targetPos) {
            // Swap games to better position
            const temp = rearranged[targetPos];
            rearranged[targetPos] = sourceGame;
            rearranged[currentPos] = temp;
          }
        });
      }
    });
    
    return rearranged;
  }

  /**
   * Extract all player IDs from a game's memberships
   */
  private getPlayerIdsFromGame(game: Game): string[] {
    if (!game.gamePlayerMemberships) {
      return [];
    }

    return game.gamePlayerMemberships
      .map(membership => membership.playerId)
      .filter(playerId => playerId != null) as string[];
  }
}