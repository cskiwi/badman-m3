import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { Game } from '@app/models';

@Component({
  standalone: true,
  selector: 'ko-chart',
  imports: [CommonModule],
  templateUrl: './ko-chart.component.html',
  styleUrls: ['./ko-chart.component.scss'],
})
export class KoChart {
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
   * Connector length for rounds in pixels
   */
  readonly connectorLength = input<number>(20);

  /**
   * Gap between columns
   */
  readonly columnGap = input<number>(50);



  readonly columnWidth = computed(() => {
    return this.matchBoxWidth();
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
    const allPossibleRounds = ['R256', 'R128', 'R64', 'R32', 'R16', 'R8', 'QF', 'SF', 'Final', 'Third', '3rd'];

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
    console.log('Calculating spacing for rounds:', rounds);

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
      case '3rd':
      case 'Third':
        return 'Third Place';
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
    return (
      game.set1Team1 === null &&
      game.set1Team2 === null &&
      game.set2Team1 === null &&
      game.set2Team2 === null &&
      game.set3Team1 === null &&
      game.set3Team2 === null
    );
  }

  isGameCompleted(game: Game): boolean {
    return game.winner !== null && game.winner !== 0;
  }

  getMatchSpacing(roundIndex: number): number {
    const matchHeight = this.matchBoxHeight();
    const baseSpacing = 20;

    if (roundIndex === 0) return baseSpacing;

    // For proper tournament bracket alignment, the spacing between matches in round N
    // must ensure that matches in round N+1 can be perfectly centered between pairs
    // from round N.
    //
    // The correct formula is: for each round, the spacing should be 
    // (matchHeight + previousRoundSpacing) + previousRoundSpacing
    // This ensures connector lines from two matches align to the center of the next match
    
    let spacing = baseSpacing;
    for (let i = 1; i <= roundIndex; i++) {
      // Calculate what the previous round's spacing was
      const prevSpacing = i === 1 ? baseSpacing : spacing;
      // The new spacing ensures perfect centering: match + spacing + match = 2 * match + spacing
      // So new spacing = (matchHeight + prevSpacing) * 2 - matchHeight = matchHeight + 2 * prevSpacing
      spacing = matchHeight + 2 * prevSpacing;
    }

    console.log(
      'Spacing for round',
      roundIndex,
      ':',
      spacing,
      '(calculated iteratively for proper alignment)'
    );

    return spacing;
  }

  getVerticalOffset(roundIndex: number): number {
    // Each match in round N should be positioned at the exact center
    // between two matches in round N-1
    if (roundIndex === 0) return 0;

    const matchHeight = this.matchBoxHeight();
    const spacing = this.spacing();
    
    // Calculate the vertical offset to center matches between pairs from the previous round
    // 
    // The key insight: each match in round N needs to be positioned exactly at the 
    // center point between two adjacent matches in round N-1.
    //
    // Since spacing doubles each round (20, 40, 80, 160, 320), 
    // the offset needed is exactly:
    // - For round 1: (matchHeight + spacing[0]) / 2 = (80 + 20) / 2 = 50px
    // - For round 2: previous offset + (matchHeight + spacing[1]) / 2 = 50 + (80 + 40) / 2 = 110px
    // - For round 3: previous offset + (matchHeight + spacing[2]) / 2 = 110 + (80 + 80) / 2 = 190px
    // - For round 4: previous offset + (matchHeight + spacing[3]) / 2 = 190 + (80 + 160) / 2 = 310px
    //
    // But actually, there's a simpler mathematical relationship based on powers of 2:
    // Each round's offset should be: (matchHeight + baseSpacing) * (2^roundIndex - 1) / 2
    
    const baseSpacing = 20;
    
    // Simple formula: offset = (matchHeight + baseSpacing) * (2^roundIndex - 1) / 2
    const offset = (matchHeight + baseSpacing) * (Math.pow(2, roundIndex) - 1) / 2;
    
    console.log(`Vertical offset for round ${roundIndex}: ${offset}px`);
    
    return offset;
  }
}
