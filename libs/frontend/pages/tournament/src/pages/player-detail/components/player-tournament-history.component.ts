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
  imports: [
    DatePipe,
    RouterModule,
    TranslateModule,
    TableModule,
    TagModule,
    ButtonModule,
    CardModule,
    AccordionModule,
    TooltipModule,
  ],
  template: `
    <div class="tournament-history-container">
      <p-accordion>
        @for (history of tournamentHistory(); track history.tournament.id + '-' + history.subEvent.id + '-' + history.draw.id) {
          <p-accordionTab>
            <ng-template pTemplate="header">
              <div class="tournament-header w-full">
                <div class="tournament-main-info">
                  <div class="tournament-name">
                    {{ history.tournament.name }}
                  </div>
                  <div class="tournament-meta">
                    <span class="event-name">{{ history.subEvent.name }}</span>
                    @if (history.draw.name) {
                      <span class="draw-name">- {{ history.draw.name }}</span>
                    }
                    @if (history.tournament.startDate) {
                      <span class="tournament-date">
                        ({{ history.tournament.startDate | date:'mediumDate' }})
                      </span>
                    }
                  </div>
                </div>
                
                <div class="tournament-summary">
                  @if (history.finalPosition) {
                    <div class="position-badge">
                      <i class="pi pi-trophy"></i>
                      #{{ history.finalPosition }}
                    </div>
                  }
                  
                  <div class="games-summary">
                    @if (getWonGames(history) > 0 || getLostGames(history) > 0) {
                      <span class="wins">{{ getWonGames(history) }}W</span>
                      <span class="separator">-</span>
                      <span class="losses">{{ getLostGames(history) }}L</span>
                    } @else {
                      <span class="no-games">{{ 'TOURNAMENT.NO_GAMES' | translate }}</span>
                    }
                  </div>
                </div>
              </div>
            </ng-template>

            <ng-template pTemplate="content">
              <div class="tournament-details">
                <!-- Tournament Information -->
                <div class="info-section mb-4">
                  <div class="grid">
                    <div class="col-12 md:col-4">
                      <div class="info-card">
                        <div class="info-label">{{ 'TOURNAMENT.EVENT_TYPE' | translate }}</div>
                        <div class="info-value">{{ history.subEvent.eventType | translate }}</div>
                      </div>
                    </div>
                    <div class="col-12 md:col-4">
                      <div class="info-card">
                        <div class="info-label">{{ 'TOURNAMENT.GAME_TYPE' | translate }}</div>
                        <div class="info-value">{{ history.subEvent.gameType | translate }}</div>
                      </div>
                    </div>
                    <div class="col-12 md:col-4">
                      <div class="info-card">
                        <div class="info-label">{{ 'TOURNAMENT.LEVEL' | translate }}</div>
                        <div class="info-value">{{ history.subEvent.level | translate }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Partner Information -->
                @if (getPartner(history)) {
                  <div class="partner-section mb-4">
                    <h4 class="section-title">
                      <i class="pi pi-users mr-2"></i>
                      {{ 'TOURNAMENT.PARTNER' | translate }}
                    </h4>
                    <div class="partner-info">
                      {{ getPartner(history) }}
                    </div>
                  </div>
                }

                <!-- Games List -->
                @if (history.games.length > 0) {
                  <div class="games-section">
                    <h4 class="section-title">
                      <i class="pi pi-list mr-2"></i>
                      {{ 'TOURNAMENT.GAMES' | translate }} ({{ history.games.length }})
                    </h4>
                    
                    <p-table
                      [value]="history.games"
                      [sortField]="'playedAt'"
                      [sortOrder]="1"
                      sortMode="single"
                      responsiveLayout="scroll"
                      styleClass="p-datatable-sm games-table">
                      
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
                                <div class="date">{{ game.playedAt | date:'shortDate' }}</div>
                                <div class="time">{{ game.playedAt | date:'shortTime' }}</div>
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
                                <p-tag 
                                  [value]="'GAME.WON' | translate"
                                  severity="success"
                                  icon="pi pi-check">
                                </p-tag>
                              } @else {
                                <p-tag 
                                  [value]="'GAME.LOST' | translate"
                                  severity="danger"
                                  icon="pi pi-times">
                                </p-tag>
                              }
                            } @else {
                              <p-tag 
                                [value]="game.status | translate"
                                severity="warning">
                              </p-tag>
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
                    size="small">
                  </p-button>
                </div>
              </div>
            </ng-template>
          </p-accordionTab>
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
  styleUrl: './player-tournament-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerTournamentHistoryComponent {
  tournamentHistory = input.required<PlayerTournamentHistory[]>();
  playerId = input.required<string>();

  getPartner(history: PlayerTournamentHistory): string | null {
    const entry = history.entry;
    const playerId = this.playerId();
    
    if (entry.player1Id === playerId && entry.player2) {
      return entry.player2.fullName;
    } else if (entry.player2Id === playerId && entry.player1) {
      return entry.player1.fullName;
    }
    
    return null;
  }

  getWonGames(history: PlayerTournamentHistory): number {
    return history.games.filter(game => this.isPlayerWinner(game)).length;
  }

  getLostGames(history: PlayerTournamentHistory): number {
    return history.games.filter(game => 
      game.status === 'completed' && !this.isPlayerWinner(game)
    ).length;
  }

  getPlayerTeam(game: any): number | null {
    const playerId = this.playerId();
    const membership = game.gamePlayerMemberships?.find(
      (gpm: any) => gpm.gamePlayer.id === playerId
    );
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
    return [
      '/tournament',
      history.tournament.slug,
      'sub-events',
      history.subEvent.id,
      'draws',
      history.draw.id
    ];
  }
}