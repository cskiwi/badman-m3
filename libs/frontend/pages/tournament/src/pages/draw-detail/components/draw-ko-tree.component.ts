import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Game } from '@app/models';
import { KoChart, OrgChartNode } from '@app/frontend-components/ko-chart';

@Component({
  selector: 'app-draw-ko-tree',
  standalone: true,
  imports: [CommonModule, KoChart],
  template: `
    <section class="ko-tree">
      <h3 class="flex items-center gap-2 text-xl font-semibold mb-6">
        <i class="pi pi-sitemap text-primary-500"></i>
        Knockout Tree
      </h3>

      <div class="tournament-bracket overflow-auto p-4">
        @if (bracketTree()) {
          <ko-chart [data]="bracketTree()!" layout="horizontal" class="tournament-bracket" [panZoomEnabled]="false">
            <ng-template #nodeTemplate let-node="node">
              <div class="match  min-w-[230px] max-w-[270px] ">
                <div class="flex flex-col gap-2">
                  <!-- Round Label -->
                  <!-- <div class="text-center text-xs text-surface-400 mb-2 border-b pb-2">
                    <span class="font-semibold">{{ node.name }}</span>
                  </div> -->

                  <!-- Team 1 -->
                  <div
                    class="player flex items-center justify-between"
                    [class]="node.data?.winner === 1 ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-surface-700 dark:text-surface-100'"
                  >
                    <span class="font-medium truncate ">
                      @let teamName1 = node.data?.team1Name;

                      @if (node.data?.isBye && !teamName1) {
                        <div class="text-xs text-center">
                          <span
                            class="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 px-3 py-1 rounded text-sm font-medium italic"
                          >
                            Bye
                          </span>
                        </div>
                      } @else {
                        {{ teamName1 }}
                      }
                    </span>
                    <div class="ml-2 font-bold text-sm">
                      {{ node.data?.team1Score }}
                    </div>
                  </div>

                  <!-- Team 2 -->
                  <div
                    class="player flex items-center justify-between"
                    [class]="node.data?.winner === 2 ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-surface-700 dark:text-surface-100'"
                  >
                    <span class="font-medium truncate ">
                      @let teamName2 = node.data?.team2Name;

                      @if (node.data?.isBye && !teamName2) {
                        <div class="text-xs text-center">
                          <span
                            class="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 px-3 py-1 rounded text-sm font-medium italic"
                          >
                            Bye
                          </span>
                        </div>
                      } @else {
                        {{ teamName2 }}
                      }
                    </span>
                    <div class="ml-2 font-bold text-sm">
                      {{ node.data?.team2Score }}
                    </div>
                  </div>
                </div>
              </div>
            </ng-template>
          </ko-chart>
        } @else {
          <!-- Generate tree from standings if no explicit tree structure -->
          <div class="text-center py-8">
            <div class="mb-4">
              <i class="pi pi-sitemap text-4xl text-muted-color"></i>
            </div>
            <h4 class="text-lg font-medium mb-2">Tournament Tree</h4>
            @if (standings().length > 0) {
              <div class="max-w-md mx-auto">
                <h5 class="font-semibold mb-4">Current Rankings:</h5>
                <div class="space-y-2">
                  @for (standing of standings() | slice: 0 : 4; track standing.id) {
                    <div class="flex justify-between items-center p-3 bg-highlight rounded border">
                      <div class="flex items-center gap-2">
                        <span class="w-6 h-6 bg-primary text-primary-contrast rounded-full flex items-center justify-center text-sm font-bold">
                          {{ standing.position }}
                        </span>
                        <span class="font-medium">
                          @if (standing.player1 || standing.player2) {
                            <div class="flex flex-col">
                              @if (standing.player1) {
                                <span>{{ standing.player1.fullName }}</span>
                              }
                              @if (standing.player2) {
                                <span>{{ standing.player2.fullName }}</span>
                              }
                            </div>
                          } @else {
                            <span>Team {{ standing.teamId | slice: 0 : 8 }}</span>
                          }
                        </span>
                      </div>
                      <span class="font-bold text-primary">{{ standing.points || 0 }} pts</span>
                    </div>
                  }
                </div>
              </div>
            } @else {
              <p class="text-muted-color">No tournament data available yet.</p>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class DrawKoTreeComponent {
  standings = input.required<any[]>();
  games = input.required<Game[]>();

  // Transform games into OrgChartNode structure for ngx-interactive-org-chart
  bracketTree = computed((): OrgChartNode | null => {
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

    // Convert to array and sort by tournament progression (reverse order for right-to-left display)
    const roundOrder = ['Final', 'SF', 'QF', 'R16', 'R32'];
    const rounds: { name: string; games: Game[] }[] = [];

    roundOrder.forEach((roundKey) => {
      if (roundsMap.has(roundKey)) {
        rounds.push({
          name: this.formatRoundName(roundKey),
          games: roundsMap.get(roundKey)!.sort((a, b) => {
            return new Date(a.playedAt || 0).getTime() - new Date(b.playedAt || 0).getTime();
          }),
        });
      }
    });

    if (rounds.length === 0) return null;

    // Start from the final (now first in our reversed order)
    const finalRound = rounds[0];
    if (!finalRound.games.length) return null;

    const finalMatch = finalRound.games[0];

    // Determine winner
    let winner = 0;
    if (finalMatch.set1Team1 !== null && finalMatch.set1Team2 !== null) {
      // Simple logic to determine winner based on first set
      if (finalMatch.set1Team1! > finalMatch.set1Team2!) {
        winner = 1;
      } else if (finalMatch.set1Team2! > finalMatch.set1Team1!) {
        winner = 2;
      }
    }

    // Create the root node (final match)
    const rootNode: OrgChartNode = {
      id: `final-${finalMatch.id}`,
      name: finalRound.name,
      data: {
        game: finalMatch,
        team1Name: this.getTeamName(finalMatch, 1),
        team2Name: this.getTeamName(finalMatch, 2),
        team1Score: this.getTeamScore(finalMatch, 1),
        team2Score: this.getTeamScore(finalMatch, 2),
        winner: winner,
        isBye: this.isBye(finalMatch),
      },
      children: this.buildOrgChartChildren(finalMatch, rounds, 1),
    };

    return rootNode;
  });

  private extractRoundName(game: Game): string {
    // Extract round info from the game's round property
    return game.round || 'Unknown';
  }

  private formatRoundName(roundKey: string): string {
    switch (roundKey) {
      case 'R128':
        return 'Round of 128';
      case 'R64':
        return 'Round of 64';
      case 'R32':
        return 'Round of 32';
      case 'R16':
        return 'Round of 16';
      case 'QF':
        return 'Quarter Final';
      case 'SF':
        return 'Semi Final';
      case 'Final':
        return 'Final';
      default:
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

  // Build children nodes for the org chart tree
  private buildOrgChartChildren(match: Game, rounds: { name: string; games: Game[] }[], targetRoundIndex: number): OrgChartNode[] {
    if (targetRoundIndex >= rounds.length) return [];

    const round = rounds[targetRoundIndex];
    if (!round) return [];

    // For a knockout bracket, each match should have 2 children (the matches that fed into it)
    // This is a simplified approach - in a real tournament you'd need to track actual match relationships
    return round.games.slice(0, 2).map((childMatch, index) => {
      // Determine winner
      let winner = 0;
      if (childMatch.set1Team1 !== null && childMatch.set1Team2 !== null) {
        // Simple logic to determine winner based on first set
        if (childMatch.set1Team1! > childMatch.set1Team2!) {
          winner = 1;
        } else if (childMatch.set1Team2! > childMatch.set1Team1!) {
          winner = 2;
        }
      }

      return {
        id: `round-${targetRoundIndex}-match-${childMatch.id || index}`,
        name: round.name,
        data: {
          game: childMatch,
          team1Name: this.getTeamName(childMatch, 1),
          team2Name: this.getTeamName(childMatch, 2),
          team1Score: this.getTeamScore(childMatch, 1),
          team2Score: this.getTeamScore(childMatch, 2),
          winner: winner,
          isBye: this.isBye(childMatch),
        },
        children: this.buildOrgChartChildren(childMatch, rounds, targetRoundIndex + 1),
      };
    });
  }
}
