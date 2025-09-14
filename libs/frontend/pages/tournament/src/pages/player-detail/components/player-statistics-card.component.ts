import { DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { type PlayerStatistics } from '../page-player-detail.service';

@Component({
  selector: 'app-player-statistics-card',
  imports: [
    DecimalPipe,
    PercentPipe,
    TranslateModule,
    CardModule,
    ProgressBarModule,
  ],
  template: `
    <div class="grid gap-4">
      <!-- Games Statistics -->
      <div class="col-12 md:col-6 lg:col-3">
        <p-card class="h-full border border-surface-200 dark:border-surface-700 hover:shadow-lg transition-all duration-200">
          <div class="flex items-start gap-4 mb-4">
            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <i class="pi pi-play-circle text-blue-600 dark:text-blue-400 text-xl"></i>
            </div>
            <div class="flex-1">
              <div class="text-surface-500 dark:text-surface-400 text-sm mb-1">
                {{ 'STATISTICS.TOTAL_GAMES' | translate }}
              </div>
              <div class="text-surface-900 dark:text-surface-50 text-2xl font-bold">
                {{ statistics().totalGames }}
              </div>
            </div>
          </div>
          
          <div class="grid gap-2 mb-4">
            <div class="col-6 flex justify-between items-center">
              <span class="text-surface-600 dark:text-surface-400 text-sm">
                {{ 'STATISTICS.WON' | translate }}
              </span>
              <span class="text-green-600 dark:text-green-400 font-semibold">
                {{ statistics().gamesWon }}
              </span>
            </div>
            <div class="col-6 flex justify-between items-center">
              <span class="text-surface-600 dark:text-surface-400 text-sm">
                {{ 'STATISTICS.LOST' | translate }}
              </span>
              <span class="text-red-600 dark:text-red-400 font-semibold">
                {{ statistics().gamesLost }}
              </span>
            </div>
          </div>

          <div class="mt-4">
            <div class="flex justify-between items-center mb-2">
              <span class="text-surface-600 dark:text-surface-400 text-sm">
                {{ 'STATISTICS.WIN_RATE' | translate }}
              </span>
              <span class="text-surface-900 dark:text-surface-50 text-sm font-semibold">
                {{ statistics().winRate | number:'1.1-1' }}%
              </span>
            </div>
            <p-progressBar 
              [value]="statistics().winRate" 
              [style]="{ height: '8px' }"
              [showValue]="false"
              styleClass="border-0">
            </p-progressBar>
          </div>
        </p-card>
      </div>

      <!-- Sets Statistics -->
      <div class="col-12 md:col-6 lg:col-3">
        <p-card class="h-full border border-surface-200 dark:border-surface-700 hover:shadow-lg transition-all duration-200">
          <div class="flex items-start gap-4 mb-4">
            <div class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <i class="pi pi-chart-bar text-green-600 dark:text-green-400 text-xl"></i>
            </div>
            <div class="flex-1">
              <div class="text-surface-500 dark:text-surface-400 text-sm mb-1">
                {{ 'STATISTICS.SETS' | translate }}
              </div>
              <div class="text-surface-900 dark:text-surface-50 text-2xl font-bold">
                {{ statistics().setsWon + statistics().setsLost }}
              </div>
            </div>
          </div>
          
          <div class="grid gap-2 mb-4">
            <div class="col-6 flex justify-between items-center">
              <span class="text-surface-600 dark:text-surface-400 text-sm">
                {{ 'STATISTICS.WON' | translate }}
              </span>
              <span class="text-green-600 dark:text-green-400 font-semibold">
                {{ statistics().setsWon }}
              </span>
            </div>
            <div class="col-6 flex justify-between items-center">
              <span class="text-surface-600 dark:text-surface-400 text-sm">
                {{ 'STATISTICS.LOST' | translate }}
              </span>
              <span class="text-red-600 dark:text-red-400 font-semibold">
                {{ statistics().setsLost }}
              </span>
            </div>
          </div>

          <div class="mt-4">
            <div class="flex justify-between items-center mb-2">
              <span class="text-surface-600 dark:text-surface-400 text-sm">
                {{ 'STATISTICS.WIN_RATE' | translate }}
              </span>
              <span class="text-surface-900 dark:text-surface-50 text-sm font-semibold">
                {{ statistics().setWinRate | number:'1.1-1' }}%
              </span>
            </div>
            <p-progressBar 
              [value]="statistics().setWinRate" 
              [style]="{ height: '8px' }"
              [showValue]="false"
              styleClass="border-0">
            </p-progressBar>
          </div>
        </p-card>
      </div>

      <!-- Points Statistics -->
      <div class="col-12 md:col-6 lg:col-3">
        <p-card class="h-full border border-surface-200 dark:border-surface-700 hover:shadow-lg transition-all duration-200">
          <div class="flex items-start gap-4 mb-4">
            <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <i class="pi pi-star text-yellow-600 dark:text-yellow-400 text-xl"></i>
            </div>
            <div class="flex-1">
              <div class="text-surface-500 dark:text-surface-400 text-sm mb-1">
                {{ 'STATISTICS.POINTS' | translate }}
              </div>
              <div class="text-surface-900 dark:text-surface-50 text-2xl font-bold">
                {{ statistics().pointsWon + statistics().pointsLost }}
              </div>
            </div>
          </div>
          
          <div class="grid gap-2 mb-4">
            <div class="col-6 flex justify-between items-center">
              <span class="text-surface-600 dark:text-surface-400 text-sm">
                {{ 'STATISTICS.WON' | translate }}
              </span>
              <span class="text-green-600 dark:text-green-400 font-semibold">
                {{ statistics().pointsWon }}
              </span>
            </div>
            <div class="col-6 flex justify-between items-center">
              <span class="text-surface-600 dark:text-surface-400 text-sm">
                {{ 'STATISTICS.LOST' | translate }}
              </span>
              <span class="text-red-600 dark:text-red-400 font-semibold">
                {{ statistics().pointsLost }}
              </span>
            </div>
          </div>

          <div class="mt-4">
            <div class="flex justify-between items-center mb-2">
              <span class="text-surface-600 dark:text-surface-400 text-sm">
                {{ 'STATISTICS.WIN_RATE' | translate }}
              </span>
              <span class="text-surface-900 dark:text-surface-50 text-sm font-semibold">
                {{ statistics().pointWinRate | number:'1.1-1' }}%
              </span>
            </div>
            <p-progressBar 
              [value]="statistics().pointWinRate" 
              [style]="{ height: '8px' }"
              [showValue]="false"
              styleClass="border-0">
            </p-progressBar>
          </div>
        </p-card>
      </div>

      <!-- Tournament Statistics -->
      <div class="col-12 md:col-6 lg:col-3">
        <p-card class="h-full border border-surface-200 dark:border-surface-700 hover:shadow-lg transition-all duration-200">
          <div class="flex items-start gap-4 mb-4">
            <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <i class="pi pi-trophy text-purple-600 dark:text-purple-400 text-xl"></i>
            </div>
            <div class="flex-1">
              <div class="text-surface-500 dark:text-surface-400 text-sm mb-1">
                {{ 'STATISTICS.TOURNAMENTS' | translate }}
              </div>
              <div class="text-surface-900 dark:text-surface-50 text-2xl font-bold">
                {{ statistics().tournaments }}
              </div>
            </div>
          </div>
          
          <div class="space-y-2">
            @if (statistics().bestPosition > 0) {
              <div class="flex justify-between items-center">
                <span class="text-surface-600 dark:text-surface-400 text-sm">
                  {{ 'STATISTICS.BEST_POSITION' | translate }}
                </span>
                <span class="text-surface-900 dark:text-surface-50 font-semibold">
                  #{{ statistics().bestPosition }}
                </span>
              </div>
            }
            @if (statistics().avgPosition > 0) {
              <div class="flex justify-between items-center">
                <span class="text-surface-600 dark:text-surface-400 text-sm">
                  {{ 'STATISTICS.AVG_POSITION' | translate }}
                </span>
                <span class="text-surface-900 dark:text-surface-50 font-semibold">
                  #{{ statistics().avgPosition | number:'1.0-0' }}
                </span>
              </div>
            }
          </div>
        </p-card>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerStatisticsCardComponent {
  statistics = input.required<PlayerStatistics>();
}