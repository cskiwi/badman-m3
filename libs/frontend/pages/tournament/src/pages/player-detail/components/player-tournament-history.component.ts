import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AccordionModule } from 'primeng/accordion';
import { TooltipModule } from 'primeng/tooltip';
import { type PlayerTournamentHistory } from '../page-player-detail.service';

@Component({
  selector: 'app-player-tournament-history',
  imports: [DatePipe, RouterModule, TranslateModule, TableModule, TagModule, ButtonModule, CardModule, AccordionModule, TooltipModule],
  template: `
    <div class="space-y-4">
      <p-accordion styleClass="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
        @for (history of tournamentHistory(); track history.tournament?.id + '-' + history.subEvent?.id + '-' + history.draw?.id) {
          <p-accordion-panel>
            <ng-template pTemplate="header">
              <div class="w-full flex justify-between items-center py-2">
                <div class="flex-1">
                  <div class="text-surface-900 dark:text-surface-50 font-semibold text-lg">
                    {{ history.tournament?.name }}
                  </div>
                  <div class="flex flex-wrap items-center gap-2 mt-1 text-sm text-surface-600 dark:text-surface-400">
                    <span class="font-medium">{{ history.subEvent?.name }}</span>
                    @if (history.draw?.name) {
                      <span>- {{ history.draw?.name }}</span>
                    }
                    @if (history.tournament?.firstDay) {
                      <span class="text-surface-500 dark:text-surface-500"> ({{ history.tournament?.firstDay | date: 'mediumDate' }}) </span>
                    }
                  </div>
                </div>

                <div class="flex items-center gap-4 ml-4">
                  @if (history.finalPosition) {
                    <div
                      class="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-semibold"
                    >
                      <i class="pi pi-trophy text-xs"></i>
                      #{{ history.finalPosition }}
                    </div>
                  }

                  <div class="text-right">
                    @if (getWonGames(history) > 0 || getLostGames(history) > 0) {
                      <div class="flex items-center gap-1">
                        <span class="text-green-600 dark:text-green-400 font-semibold">{{ getWonGames(history) }}W</span>
                        <span class="text-surface-400 dark:text-surface-600">-</span>
                        <span class="text-red-600 dark:text-red-400 font-semibold">{{ getLostGames(history) }}L</span>
                      </div>
                    } @else {
                      <span class="text-surface-500 dark:text-surface-500 text-sm">{{ 'TOURNAMENT.NO_GAMES' | translate }}</span>
                    }
                  </div>
                </div>
              </div>
            </ng-template>

            <ng-template pTemplate="content">
              <div class="space-y-6 p-6">
                <!-- Tournament Information -->
                <div class="grid gap-4">
                  <div class="col-12 md:col-4">
                    <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
                      <div class="text-surface-500 dark:text-surface-400 text-sm font-medium mb-1">
                        {{ 'TOURNAMENT.EVENT_TYPE' | translate }}
                      </div>
                      <div class="text-surface-900 dark:text-surface-50 font-semibold">
                        {{ history.subEvent?.eventType | translate }}
                      </div>
                    </div>
                  </div>
                  <div class="col-12 md:col-4">
                    <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
                      <div class="text-surface-500 dark:text-surface-400 text-sm font-medium mb-1">
                        {{ 'TOURNAMENT.GAME_TYPE' | translate }}
                      </div>
                      <div class="text-surface-900 dark:text-surface-50 font-semibold">
                        {{ history.subEvent?.gameType | translate }}
                      </div>
                    </div>
                  </div>
                  <div class="col-12 md:col-4">
                    <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
                      <div class="text-surface-500 dark:text-surface-400 text-sm font-medium mb-1">
                        {{ 'TOURNAMENT.LEVEL' | translate }}
                      </div>
                      <div class="text-surface-900 dark:text-surface-50 font-semibold">
                        {{ history.subEvent?.level }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Partner Information -->
                @if (getPartner(history)) {
                  <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <div class="flex items-center gap-3 mb-2">
                      <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <i class="pi pi-users text-blue-600 dark:text-blue-400"></i>
                      </div>
                      <h4 class="text-surface-900 dark:text-surface-50 font-semibold m-0">
                        {{ 'TOURNAMENT.PARTNER' | translate }}
                      </h4>
                    </div>
                    <div class="text-surface-700 dark:text-surface-300 font-medium pl-11">
                      {{ getPartner(history) }}
                    </div>
                  </div>
                }

                <!-- Games List -->
                @if ((history.games?.length ?? 0) > 0) {
                  <div class="games-section">
                    <h4 class="section-title">
                      <i class="pi pi-list mr-2"></i>
                      {{ 'TOURNAMENT.GAMES' | translate }} ({{ history.games?.length ?? 0 }})
                    </h4>

                    <p-table
                      [value]="history.games!"
                      [sortField]="'playedAt'"
                      [sortOrder]="1"
                      sortMode="single"
                      responsiveLayout="scroll"
                      styleClass="p-datatable-sm games-table"
                    >
                      <ng-template pTemplate="header">
                        <tr>
                          <th>{{ 'GAME.DATE' | translate }}</th>
                          <th>{{ 'GAME.ROUND' | translate }}</th>
                          <th>{{ 'GAME.OPPONENT' | translate }}</th>
                          <th>{{ 'GAME.SCORE' | translate }}</th>
                          <th>{{ 'GAME.RESULT' | translate }}</th>
                        </tr>
                      </ng-template>

                      <ng-template pTemplate="body" let-game>
                        <tr>
                          <!-- Date -->
                          <td>
                            @if (game.playedAt) {
                              <div class="date-info">
                                <div class="date">{{ game.playedAt | date: 'shortDate' }}</div>
                                <div class="time">{{ game.playedAt | date: 'shortTime' }}</div>
                              </div>
                            } @else {
                              <span class="text-color-secondary">{{ 'COMMON.NOT_PLAYED' | translate }}</span>
                            }
                          </td>

                          <!-- Round -->
                          <td>
                            @if (game.round) {
                              <span class="round-badge">{{ game.round }}</span>
                            } @else {
                              <span class="text-color-secondary">-</span>
                            }
                          </td>

                          <!-- Opponent -->
                          <td>
                            <div class="opponent-info">
                              {{ getOpponentNames(game) }}
                            </div>
                          </td>

                          <!-- Score -->
                          <td>
                            @if (hasScore(game)) {
                              <div class="score-display">
                                @if (game.set1Team1 !== null && game.set1Team2 !== null) {
                                  <span class="set" [class.winner]="isSetWinner(game, 1)" [class.loser]="!isSetWinner(game, 1)">
                                    {{ getPlayerScore(game, 1) }}-{{ getOpponentScore(game, 1) }}
                                  </span>
                                }
                                @if (game.set2Team1 !== null && game.set2Team2 !== null) {
                                  <span class="set" [class.winner]="isSetWinner(game, 2)" [class.loser]="!isSetWinner(game, 2)">
                                    {{ getPlayerScore(game, 2) }}-{{ getOpponentScore(game, 2) }}
                                  </span>
                                }
                                @if (game.set3Team1 !== null && game.set3Team2 !== null) {
                                  <span class="set" [class.winner]="isSetWinner(game, 3)" [class.loser]="!isSetWinner(game, 3)">
                                    {{ getPlayerScore(game, 3) }}-{{ getOpponentScore(game, 3) }}
                                  </span>
                                }
                              </div>
                            } @else {
                              <span class="text-color-secondary">-</span>
                            }
                          </td>

                          <!-- Result -->
                          <td>
                            @if (game.status === 'completed') {
                              @if (isPlayerWinner(game)) {
                                <p-tag [value]="'GAME.WON' | translate" severity="success" icon="pi pi-check"> </p-tag>
                              } @else {
                                <p-tag [value]="'GAME.LOST' | translate" severity="danger" icon="pi pi-times"> </p-tag>
                              }
                            } @else {
                              <p-tag [value]="game.status | translate" severity="warn"> </p-tag>
                            }
                          </td>
                        </tr>
                      </ng-template>
                    </p-table>
                  </div>
                } @else {
                  <div class="no-games-message">
                    <i class="pi pi-info-circle text-2xl text-color-secondary"></i>
                    <p class="mt-2 text-color-secondary">{{ 'TOURNAMENT.NO_GAMES_PLAYED' | translate }}</p>
                  </div>
                }

                <!-- Action Buttons -->
                <div class="actions-section mt-4">
                  <p-button
                    [label]="'TOURNAMENT.VIEW_DETAILS' | translate"
                    icon="pi pi-external-link"
                    [routerLink]="getTournamentLink(history)"
                    severity="secondary"
                    size="small"
                  >
                  </p-button>
                </div>
              </div>
            </ng-template>
          </p-accordion-panel>
        }
      </p-accordion>

      @if (tournamentHistory().length === 0) {
        <div class="empty-state">
          <i class="pi pi-info-circle text-4xl text-color-secondary"></i>
          <p class="text-lg text-color-secondary mt-3">
            {{ 'TOURNAMENT.NO_HISTORY' | translate }}
          </p>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerTournamentHistoryComponent {
  tournamentHistory = input.required<PlayerTournamentHistory[]>();
  playerId = input.required<string>();

  getPartner(history: PlayerTournamentHistory): string | null {
    const entry = history.entry;
    const playerId = this.playerId();

    if (entry?.player1Id === playerId && entry.player2) {
      return entry.player2.fullName;
    } else if (entry?.player2Id === playerId && entry.player1) {
      return entry.player1.fullName;
    }

    return null;
  }

  getWonGames(history: PlayerTournamentHistory): number {
    return history.games?.filter((game) => this.isPlayerWinner(game)).length || 0;
  }

  getLostGames(history: PlayerTournamentHistory): number {
    return history.games?.filter((game) => game.status === 'NORMAL' && !this.isPlayerWinner(game)).length || 0;
  }

  getPlayerTeam(game: any): number | null {
    const playerId = this.playerId();
    const membership = game.gamePlayerMemberships?.find((gpm: any) => gpm.gamePlayer.id === playerId);
    return membership ? membership.team : null;
  }

  isPlayerWinner(game: any): boolean {
    const playerTeam = this.getPlayerTeam(game);
    return playerTeam !== null && game.winner === playerTeam;
  }

  getOpponentNames(game: any): string {
    const playerId = this.playerId();
    const opponents = game.gamePlayerMemberships
      ?.filter((gpm: any) => gpm.gamePlayer.id !== playerId)
      .map((gpm: any) => gpm.gamePlayer.fullName)
      .join(' & ');

    return opponents || 'Unknown';
  }

  hasScore(game: any): boolean {
    return game.set1Team1 !== null && game.set1Team2 !== null;
  }

  getPlayerScore(game: any, setNumber: 1 | 2 | 3): number {
    const playerTeam = this.getPlayerTeam(game);
    if (playerTeam === null) return 0;

    const scoreKey = `set${setNumber}Team${playerTeam}`;
    return game[scoreKey] || 0;
  }

  getOpponentScore(game: any, setNumber: 1 | 2 | 3): number {
    const playerTeam = this.getPlayerTeam(game);
    if (playerTeam === null) return 0;

    const opponentTeam = playerTeam === 1 ? 2 : 1;
    const scoreKey = `set${setNumber}Team${opponentTeam}`;
    return game[scoreKey] || 0;
  }

  isSetWinner(game: any, setNumber: 1 | 2 | 3): boolean {
    const playerScore = this.getPlayerScore(game, setNumber);
    const opponentScore = this.getOpponentScore(game, setNumber);
    return playerScore > opponentScore;
  }

  getTournamentLink(history: PlayerTournamentHistory): string[] {
    // Guard against missing tournament or slug to avoid 'possibly undefined' and 'string | undefined' errors.
    const tournament = history.tournament;
    if (!tournament || !tournament.slug) {
      // Fallback: link to tournament list if specific tournament slug is unavailable.
      return ['/tournament'];
    }

    return ['/tournament', tournament.slug, 'sub-events', String(history.subEvent?.id), 'draws', String(history.draw?.id)];
  }
}
