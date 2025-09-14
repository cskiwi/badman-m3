import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';
import { type Game } from '@app/models';

@Component({
  selector: 'app-player-games-table',
  imports: [
    DatePipe,
    RouterModule,
    TranslateModule,
    TableModule,
    TagModule,
    ButtonModule,
    PaginatorModule,
    TooltipModule,
  ],
  template: `
    <div class="games-table-container">
      <p-table
        [value]="games()"
        [paginator]="showPagination()"
        [rows]="20"
        [rowsPerPageOptions]="[10, 20, 50]"
        [loading]="false"
        [sortField]="'playedAt'"
        [sortOrder]="-1"
        sortMode="single"
        responsiveLayout="scroll"
        styleClass="p-datatable-sm">
        
        <!-- Date Column -->
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="playedAt">
              {{ 'GAME.DATE' | translate }}
              <p-sortIcon field="playedAt"></p-sortIcon>
            </th>
            @if (showTournamentInfo()) {
              <th>{{ 'GAME.TOURNAMENT' | translate }}</th>
            }
            <th>{{ 'GAME.OPPONENT' | translate }}</th>
            <th>{{ 'GAME.SCORE' | translate }}</th>
            <th>{{ 'GAME.RESULT' | translate }}</th>
            <th>{{ 'GAME.ROUND' | translate }}</th>
            <th></th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-game>
          <tr>
            <!-- Date -->
            <td>
              <div class="date-cell">
                @if (game.playedAt) {
                  <span class="date">{{ game.playedAt | date:'shortDate' }}</span>
                  <span class="time">{{ game.playedAt | date:'shortTime' }}</span>
                } @else {
                  <span class="text-color-secondary">{{ 'COMMON.NOT_PLAYED' | translate }}</span>
                }
              </div>
            </td>

            <!-- Tournament Info -->
            @if (showTournamentInfo()) {
              <td>
                @if (game.draw?.subEvent?.tournament) {
                  <div class="tournament-info">
                    <a [routerLink]="['/tournament', game.draw.subEvent.tournament.slug]" 
                       class="tournament-link">
                      {{ game.draw.subEvent.tournament.name }}
                    </a>
                    <div class="sub-event-info">
                      {{ game.draw.subEvent.name }}
                      @if (game.draw.name) {
                        - {{ game.draw.name }}
                      }
                    </div>
                  </div>
                } @else {
                  <span class="text-color-secondary">-</span>
                }
              </td>
            }

            <!-- Opponent -->
            <td>
              <div class="opponent-cell">
                {{ getOpponentNames(game) }}
              </div>
            </td>

            <!-- Score -->
            <td>
              <div class="score-cell">
                @if (hasScore(game)) {
                  <div class="sets">
                    @if (game.set1Team1 !== null && game.set1Team2 !== null) {
                      <span class="set" [class.winner]="isSetWinner(game, 1)" 
                            [class.loser]="!isSetWinner(game, 1)">
                        {{ getPlayerScore(game, 1) }}-{{ getOpponentScore(game, 1) }}
                      </span>
                    }
                    @if (game.set2Team1 !== null && game.set2Team2 !== null) {
                      <span class="set" [class.winner]="isSetWinner(game, 2)" 
                            [class.loser]="!isSetWinner(game, 2)">
                        {{ getPlayerScore(game, 2) }}-{{ getOpponentScore(game, 2) }}
                      </span>
                    }
                    @if (game.set3Team1 !== null && game.set3Team2 !== null) {
                      <span class="set" [class.winner]="isSetWinner(game, 3)" 
                            [class.loser]="!isSetWinner(game, 3)">
                        {{ getPlayerScore(game, 3) }}-{{ getOpponentScore(game, 3) }}
                      </span>
                    }
                  </div>
                } @else {
                  <span class="text-color-secondary">-</span>
                }
              </div>
            </td>

            <!-- Result -->
            <td>
              <div class="result-cell">
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
              </div>
            </td>

            <!-- Round -->
            <td>
              @if (game.round) {
                <span class="round-badge">{{ game.round }}</span>
              } @else {
                <span class="text-color-secondary">-</span>
              }
            </td>

            <!-- Actions -->
            <td>
              @if (game.draw?.subEvent?.tournament) {
                <p-button
                  icon="pi pi-external-link"
                  [routerLink]="getGameLink(game)"
                  severity="secondary"
                  size="small"
                  [text]="true"
                  [pTooltip]="'GAME.VIEW_DETAILS' | translate">
                </p-button>
              }
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td [attr.colspan]="showTournamentInfo() ? 7 : 6" class="text-center">
              <div class="empty-message">
                <i class="pi pi-info-circle text-2xl text-color-secondary"></i>
                <p class="mt-2 text-color-secondary">{{ 'GAME.NO_GAMES_FOUND' | translate }}</p>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerGamesTableComponent {
  games = input.required<Game[]>();
  playerId = input.required<string>();
  showTournamentInfo = input<boolean>(false);
  showPagination = input<boolean>(false);

  getOpponentNames(game: Game): string {
    const playerId = this.playerId();
    const opponents = game.gamePlayerMemberships
      ?.filter(gpm => gpm.gamePlayer.id !== playerId)
      .map(gpm => gpm.gamePlayer.fullName)
      .join(' & ');
    
    return opponents || 'Unknown';
  }

  getPlayerTeam(game: Game): number | null {
    const playerId = this.playerId();
    const membership = game.gamePlayerMemberships?.find(
      gpm => gpm.gamePlayer.id === playerId
    );
    return membership ? membership.team : null;
  }

  isPlayerWinner(game: Game): boolean {
    const playerTeam = this.getPlayerTeam(game);
    return playerTeam !== null && game.winner === playerTeam;
  }

  hasScore(game: Game): boolean {
    return game.set1Team1 !== null && game.set1Team2 !== null;
  }

  getPlayerScore(game: Game, setNumber: 1 | 2 | 3): number {
    const playerTeam = this.getPlayerTeam(game);
    if (playerTeam === null) return 0;

    const scoreKey = `set${setNumber}Team${playerTeam}` as keyof Game;
    return (game[scoreKey] as number) || 0;
  }

  getOpponentScore(game: Game, setNumber: 1 | 2 | 3): number {
    const playerTeam = this.getPlayerTeam(game);
    if (playerTeam === null) return 0;

    const opponentTeam = playerTeam === 1 ? 2 : 1;
    const scoreKey = `set${setNumber}Team${opponentTeam}` as keyof Game;
    return (game[scoreKey] as number) || 0;
  }

  isSetWinner(game: Game, setNumber: 1 | 2 | 3): boolean {
    const playerScore = this.getPlayerScore(game, setNumber);
    const opponentScore = this.getOpponentScore(game, setNumber);
    return playerScore > opponentScore;
  }

  getGameLink(game: Game): string[] | null {
    if (!game.draw?.subEvent?.tournament) return null;
    
    return [
      '/tournament',
      game.draw.subEvent.tournament.slug,
      'sub-events',
      game.draw.subEvent.id,
      'draws',
      game.draw.id
    ];
  }
}