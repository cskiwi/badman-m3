import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { DataViewModule } from 'primeng/dataview';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { type Game } from '@app/models';
import { GameStatus } from '../../../../../../../models/enum/src';

interface HeadToHeadRecord {
  opponentId: string;
  opponentName: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  setsWon: number;
  setsLost: number;
  setWinRate: number;
  pointsWon: number;
  pointsLost: number;
  pointWinRate: number;
  lastGame?: Game;
  recentForm: ('W' | 'L')[];
  tournaments: number;
}

@Component({
  selector: 'app-player-head-to-head',
  imports: [
    DecimalPipe,
    PercentPipe,
    RouterModule,
    TranslateModule,
    CardModule,
    DataViewModule,
    TableModule,
    TagModule,
    ButtonModule,
    ProgressBarModule,
    AvatarModule,
    BadgeModule,
    TooltipModule,
    DatePipe,
  ],
  template: `
    <div class="head-to-head-container">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
            <i class="pi pi-users text-primary-600 dark:text-primary-400 text-lg"></i>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-50 m-0">
              {{ 'PLAYER.HEAD_TO_HEAD' | translate }}
            </h2>
            <p class="text-surface-600 dark:text-surface-400 text-sm m-0 mt-1">
              {{ 'PLAYER.HEAD_TO_HEAD_DESCRIPTION' | translate }}
            </p>
          </div>
        </div>

        <!-- Summary Stats -->
        <div class="grid gap-4 mb-6">
          <div class="col-12 md:col-6 lg:col-3">
            <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <i class="pi pi-users text-blue-600 dark:text-blue-400"></i>
                </div>
                <div>
                  <div class="text-surface-500 dark:text-surface-400 text-sm">
                    {{ 'PLAYER.UNIQUE_OPPONENTS' | translate }}
                  </div>
                  <div class="text-surface-900 dark:text-surface-50 text-xl font-semibold">
                    {{ headToHeadRecords().length }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 md:col-6 lg:col-3">
            <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <i class="pi pi-check text-green-600 dark:text-green-400"></i>
                </div>
                <div>
                  <div class="text-surface-500 dark:text-surface-400 text-sm">
                    {{ 'PLAYER.FAVORABLE_MATCHUPS' | translate }}
                  </div>
                  <div class="text-surface-900 dark:text-surface-50 text-xl font-semibold">
                    {{ favorableMatchups() }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 md:col-6 lg:col-3">
            <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                  <i class="pi pi-times text-red-600 dark:text-red-400"></i>
                </div>
                <div>
                  <div class="text-surface-500 dark:text-surface-400 text-sm">
                    {{ 'PLAYER.DIFFICULT_MATCHUPS' | translate }}
                  </div>
                  <div class="text-surface-900 dark:text-surface-50 text-xl font-semibold">
                    {{ difficultMatchups() }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 md:col-6 lg:col-3">
            <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                  <i class="pi pi-star text-yellow-600 dark:text-yellow-400"></i>
                </div>
                <div>
                  <div class="text-surface-500 dark:text-surface-400 text-sm">
                    {{ 'PLAYER.BEST_OPPONENT' | translate }}
                  </div>
                  <div class="text-surface-900 dark:text-surface-50 text-sm font-semibold truncate max-w-32">
                    {{ bestOpponent()?.opponentName || 'N/A' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Head-to-Head Records -->
      @if (headToHeadRecords().length > 0) {
        <p-dataView [value]="headToHeadRecords()" layout="grid" [paginator]="true" [rows]="12" [sortField]="'gamesPlayed'" [sortOrder]="-1">
          <ng-template pTemplate="gridItem" let-record>
            <div class="col-12 md:col-6 lg:col-4">
              <p-card class="h-full border border-surface-200 dark:border-surface-700 hover:shadow-lg transition-all duration-200">
                <!-- Header -->
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <p-avatar
                      [label]="getInitials(record.opponentName)"
                      size="large"
                      shape="circle"
                      styleClass="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 font-semibold"
                    >
                    </p-avatar>
                    <div>
                      <div class="text-surface-900 dark:text-surface-50 font-semibold text-base">
                        {{ record.opponentName }}
                      </div>
                      <div class="text-surface-500 dark:text-surface-400 text-sm">
                        {{ record.gamesPlayed }}
                        {{ record.gamesPlayed === 1 ? ('GAME.GAME' | translate) : ('GAME.GAMES' | translate) }}
                      </div>
                    </div>
                  </div>

                  <!-- Win Rate Badge -->
                  <p-badge [value]="record.winRate | number: '1.0-0'" [severity]="getWinRateSeverity(record.winRate)" size="large"> </p-badge>
                </div>

                <!-- Game Record -->
                <div class="grid gap-4 mb-4">
                  <div class="col-6">
                    <div class="text-center">
                      <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                        {{ record.gamesWon }}
                      </div>
                      <div class="text-surface-500 dark:text-surface-400 text-xs">
                        {{ 'STATISTICS.WON' | translate }}
                      </div>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="text-center">
                      <div class="text-2xl font-bold text-red-600 dark:text-red-400">
                        {{ record.gamesLost }}
                      </div>
                      <div class="text-surface-500 dark:text-surface-400 text-xs">
                        {{ 'STATISTICS.LOST' | translate }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Win Rate Progress -->
                <div class="mb-4">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-surface-600 dark:text-surface-400 text-sm">
                      {{ 'STATISTICS.WIN_RATE' | translate }}
                    </span>
                    <span class="text-surface-900 dark:text-surface-50 text-sm font-semibold"> {{ record.winRate | number: '1.1-1' }}% </span>
                  </div>
                  <p-progressBar [value]="record.winRate" [style]="{ height: '6px' }" [showValue]="false" styleClass="mb-2"> </p-progressBar>
                </div>

                <!-- Recent Form -->
                @if (record.recentForm.length > 0) {
                  <div class="mb-4">
                    <div class="text-surface-600 dark:text-surface-400 text-sm mb-2">
                      {{ 'PLAYER.RECENT_FORM' | translate }}
                    </div>
                    <div class="flex gap-1">
                      @for (result of record.recentForm; track $index) {
                        <div
                          class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                          [class]="
                            result === 'W'
                              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                          "
                        >
                          {{ result }}
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Additional Stats -->
                <div class="grid gap-2 text-sm">
                  <div class="col-12 flex justify-between">
                    <span class="text-surface-600 dark:text-surface-400"> {{ 'STATISTICS.SETS' | translate }}: </span>
                    <span class="text-surface-900 dark:text-surface-50"> {{ record.setsWon }}-{{ record.setsLost }} </span>
                  </div>
                  <div class="col-12 flex justify-between">
                    <span class="text-surface-600 dark:text-surface-400"> {{ 'STATISTICS.SET_WIN_RATE' | translate }}: </span>
                    <span class="text-surface-900 dark:text-surface-50"> {{ record.setWinRate | number: '1.1-1' }}% </span>
                  </div>
                  @if (record.lastGame?.playedAt) {
                    <div class="col-12 flex justify-between">
                      <span class="text-surface-600 dark:text-surface-400"> {{ 'PLAYER.LAST_PLAYED' | translate }}: </span>
                      <span class="text-surface-900 dark:text-surface-50">
                        {{ record.lastGame.playedAt | date: 'shortDate' }}
                      </span>
                    </div>
                  }
                </div>
              </p-card>
            </div>
          </ng-template>

          <ng-template pTemplate="empty">
            <div class="col-12">
              <div class="text-center py-8">
                <i class="pi pi-info-circle text-4xl text-surface-400 dark:text-surface-500 mb-4"></i>
                <h3 class="text-lg font-semibold text-surface-600 dark:text-surface-400 mb-2">
                  {{ 'PLAYER.NO_HEAD_TO_HEAD' | translate }}
                </h3>
                <p class="text-surface-500 dark:text-surface-400">
                  {{ 'PLAYER.NO_HEAD_TO_HEAD_DESCRIPTION' | translate }}
                </p>
              </div>
            </div>
          </ng-template>
        </p-dataView>
      } @else {
        <div class="text-center py-12">
          <i class="pi pi-info-circle text-6xl text-surface-400 dark:text-surface-500 mb-4"></i>
          <h3 class="text-xl font-semibold text-surface-600 dark:text-surface-400 mb-2">
            {{ 'PLAYER.NO_HEAD_TO_HEAD' | translate }}
          </h3>
          <p class="text-surface-500 dark:text-surface-400">
            {{ 'PLAYER.NO_HEAD_TO_HEAD_DESCRIPTION' | translate }}
          </p>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerHeadToHeadComponent {
  games = input.required<Game[]>();
  playerId = input.required<string>();

  headToHeadRecords = computed(() => {
    const games = this.games().filter((game) => game.status === GameStatus.NORMAL && game.gamePlayerMemberships);

    const recordsMap = new Map<string, HeadToHeadRecord>();

    games.forEach((game) => {
      const playerId = this.playerId();
      const playerMembership = game.gamePlayerMemberships?.find((gpm) => gpm.gamePlayer.id === playerId);

      if (!playerMembership) return;

      // Get opponents
      const opponentMemberships = game.gamePlayerMemberships?.filter((gpm) => gpm.gamePlayer.id !== playerId) || [];

      opponentMemberships.forEach((opponentMembership) => {
        const opponentId = opponentMembership.gamePlayer.id;
        const opponentName = opponentMembership.gamePlayer.fullName;

        if (!recordsMap.has(opponentId)) {
          recordsMap.set(opponentId, {
            opponentId,
            opponentName,
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            winRate: 0,
            setsWon: 0,
            setsLost: 0,
            setWinRate: 0,
            pointsWon: 0,
            pointsLost: 0,
            pointWinRate: 0,
            recentForm: [],
            tournaments: 0,
          });
        }

        const record = recordsMap.get(opponentId)!;
        record.gamesPlayed++;

        const isWinner = game.winner === playerMembership.team;
        if (isWinner) {
          record.gamesWon++;
          record.recentForm.unshift('W');
        } else {
          record.gamesLost++;
          record.recentForm.unshift('L');
        }

        // Keep only last 5 results
        if (record.recentForm.length > 5) {
          record.recentForm = record.recentForm.slice(0, 5);
        }

        // Calculate sets and points
        const sets = [
          { team1: game.set1Team1, team2: game.set1Team2 },
          { team1: game.set2Team1, team2: game.set2Team2 },
          { team1: game.set3Team1, team2: game.set3Team2 },
        ].filter((set) => set.team1 !== null && set.team2 !== null);

        sets.forEach((set) => {
          const playerPoints = playerMembership.team === 1 ? set.team1! : set.team2!;
          const opponentPoints = playerMembership.team === 1 ? set.team2! : set.team1!;

          record.pointsWon += playerPoints;
          record.pointsLost += opponentPoints;

          if (playerPoints > opponentPoints) {
            record.setsWon++;
          } else {
            record.setsLost++;
          }
        });

        // Update last game
        if (!record.lastGame || (game.playedAt && record.lastGame.playedAt && new Date(game.playedAt) > new Date(record.lastGame.playedAt))) {
          record.lastGame = game;
        }
      });
    });

    // Calculate rates and sort
    return Array.from(recordsMap.values())
      .map((record) => ({
        ...record,
        winRate: record.gamesPlayed > 0 ? (record.gamesWon / record.gamesPlayed) * 100 : 0,
        setWinRate: record.setsWon + record.setsLost > 0 ? (record.setsWon / (record.setsWon + record.setsLost)) * 100 : 0,
        pointWinRate: record.pointsWon + record.pointsLost > 0 ? (record.pointsWon / (record.pointsWon + record.pointsLost)) * 100 : 0,
      }))
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed);
  });

  favorableMatchups = computed(() => {
    return this.headToHeadRecords().filter((record) => record.winRate > 50).length;
  });

  difficultMatchups = computed(() => {
    return this.headToHeadRecords().filter((record) => record.winRate < 50).length;
  });

  bestOpponent = computed(() => {
    return (
      this.headToHeadRecords()
        .filter((record) => record.gamesPlayed >= 3)
        .sort((a, b) => b.winRate - a.winRate)[0] || null
    );
  });

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }

  getWinRateSeverity(winRate: number): 'success' | 'warn' | 'danger' | 'info' {
    if (winRate >= 70) return 'success';
    if (winRate >= 50) return 'info';
    if (winRate >= 30) return 'warn';
    return 'danger';
  }
}
