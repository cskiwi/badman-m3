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
    <div class="statistics-grid">
      <!-- Games Statistics -->
      <p-card class="stat-card games-card">
        <div class="stat-content">
          <div class="stat-icon">
            <i class="pi pi-play-circle"></i>
          </div>
          <div class="stat-details">
            <div class="stat-label">{{ 'STATISTICS.TOTAL_GAMES' | translate }}</div>
            <div class="stat-value">{{ statistics().totalGames }}</div>
            <div class="stat-breakdown">
              <div class="breakdown-item win">
                <span class="breakdown-label">{{ 'STATISTICS.WON' | translate }}</span>
                <span class="breakdown-value">{{ statistics().gamesWon }}</span>
              </div>
              <div class="breakdown-item loss">
                <span class="breakdown-label">{{ 'STATISTICS.LOST' | translate }}</span>
                <span class="breakdown-value">{{ statistics().gamesLost }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="stat-progress">
          <p-progressBar 
            [value]="statistics().winRate" 
            [style]="{ height: '0.5rem' }"
            [showValue]="false">
          </p-progressBar>
          <div class="progress-label">
            {{ statistics().winRate | number:'1.1-1' }}% {{ 'STATISTICS.WIN_RATE' | translate }}
          </div>
        </div>
      </p-card>

      <!-- Sets Statistics -->
      <p-card class="stat-card sets-card">
        <div class="stat-content">
          <div class="stat-icon">
            <i class="pi pi-chart-bar"></i>
          </div>
          <div class="stat-details">
            <div class="stat-label">{{ 'STATISTICS.SETS' | translate }}</div>
            <div class="stat-value">{{ statistics().setsWon + statistics().setsLost }}</div>
            <div class="stat-breakdown">
              <div class="breakdown-item win">
                <span class="breakdown-label">{{ 'STATISTICS.WON' | translate }}</span>
                <span class="breakdown-value">{{ statistics().setsWon }}</span>
              </div>
              <div class="breakdown-item loss">
                <span class="breakdown-label">{{ 'STATISTICS.LOST' | translate }}</span>
                <span class="breakdown-value">{{ statistics().setsLost }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="stat-progress">
          <p-progressBar 
            [value]="statistics().setWinRate" 
            [style]="{ height: '0.5rem' }"
            [showValue]="false"
            styleClass="sets-progress">
          </p-progressBar>
          <div class="progress-label">
            {{ statistics().setWinRate | number:'1.1-1' }}% {{ 'STATISTICS.WIN_RATE' | translate }}
          </div>
        </div>
      </p-card>

      <!-- Points Statistics -->
      <p-card class="stat-card points-card">
        <div class="stat-content">
          <div class="stat-icon">
            <i class="pi pi-star"></i>
          </div>
          <div class="stat-details">
            <div class="stat-label">{{ 'STATISTICS.POINTS' | translate }}</div>
            <div class="stat-value">{{ statistics().pointsWon + statistics().pointsLost }}</div>
            <div class="stat-breakdown">
              <div class="breakdown-item win">
                <span class="breakdown-label">{{ 'STATISTICS.WON' | translate }}</span>
                <span class="breakdown-value">{{ statistics().pointsWon }}</span>
              </div>
              <div class="breakdown-item loss">
                <span class="breakdown-label">{{ 'STATISTICS.LOST' | translate }}</span>
                <span class="breakdown-value">{{ statistics().pointsLost }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="stat-progress">
          <p-progressBar 
            [value]="statistics().pointWinRate" 
            [style]="{ height: '0.5rem' }"
            [showValue]="false"
            styleClass="points-progress">
          </p-progressBar>
          <div class="progress-label">
            {{ statistics().pointWinRate | number:'1.1-1' }}% {{ 'STATISTICS.WIN_RATE' | translate }}
          </div>
        </div>
      </p-card>

      <!-- Tournament Statistics -->
      <p-card class="stat-card tournaments-card">
        <div class="stat-content">
          <div class="stat-icon">
            <i class="pi pi-trophy"></i>
          </div>
          <div class="stat-details">
            <div class="stat-label">{{ 'STATISTICS.TOURNAMENTS' | translate }}</div>
            <div class="stat-value">{{ statistics().tournaments }}</div>
            <div class="stat-breakdown">
              @if (statistics().bestPosition > 0) {
                <div class="breakdown-item best">
                  <span class="breakdown-label">{{ 'STATISTICS.BEST_POSITION' | translate }}</span>
                  <span class="breakdown-value">#{{ statistics().bestPosition }}</span>
                </div>
              }
              @if (statistics().avgPosition > 0) {
                <div class="breakdown-item avg">
                  <span class="breakdown-label">{{ 'STATISTICS.AVG_POSITION' | translate }}</span>
                  <span class="breakdown-value">#{{ statistics().avgPosition | number:'1.0-0' }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </p-card>
    </div>
  `,
  styleUrl: './player-statistics-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerStatisticsCardComponent {
  statistics = input.required<PlayerStatistics>();
}