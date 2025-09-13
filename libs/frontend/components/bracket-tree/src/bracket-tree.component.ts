import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { Game } from '@app/models';

@Component({
  standalone: true,
  selector: 'bracket-tree',
  imports: [CommonModule],
  templateUrl: './bracket-tree.component.html',
})
export class BracketTree {
  /**
   * Games data for bracket mode
   */
  readonly games = input<Game[]>([]);

  /**
   * Standings data for bracket mode fallback
   */
  readonly standings = input<any[]>([]);

  /**
   * Width for match boxes in pixels
   */
  readonly matchBoxWidth = input<number>(220);

  /**
   * Height for match boxes in pixels
   */
  readonly matchBoxHeight = input<number>(80);

  /**
   * Gap between columns
   */
  readonly columnGap = input<number>(40);

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
      roundsMap.get(roundName)!.push(game);
    });

    // Define all possible tournament rounds from largest to smallest
    const allPossibleRounds = ['R256', 'R128', 'R64', 'R32', 'R16', 'R8', 'QF', 'SF', 'Final', 'Third'];

    // Filter to only include rounds that actually exist in the data
    const existingRounds = allPossibleRounds.filter((round) => roundsMap.has(round));
    const rounds: { name: string; games: Game[] }[] = [];

    existingRounds.forEach((roundKey) => {
      if (roundsMap.has(roundKey)) {
        rounds.push({
          name: this.formatRoundName(roundKey),
          games: roundsMap.get(roundKey)!.sort((a, b) => {
            return new Date(a.playedAt || 0).getTime() - new Date(b.playedAt || 0).getTime();
          }),
        });
      }
    });

    return rounds.length > 0 ? rounds : null;
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
    const memberships = game.gamePlayerMemberships || [];
    const teamMembers = memberships.filter((m) => m.team === teamNumber);

    if (teamMembers.length === 0) return '';

    const names = teamMembers.map((m) => m.gamePlayer?.fullName || 'Unknown').filter((name) => name !== 'Unknown');

    if (names.length === 0) return '';

    return names.join(' / ');
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
}
