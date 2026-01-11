import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { ClubPerformanceTabService } from './club-performance-tab.service';

@Component({
  selector: 'app-club-performance-tab',
  standalone: true,
  imports: [
    TranslateModule,
    CardModule,
    ChartModule,
    SkeletonModule,
  ],
  providers: [ClubPerformanceTabService],
  template: `
    @if (service.loading()) {
      <div class="grid gap-6 lg:grid-cols-2">
        @for (i of [1, 2, 3, 4]; track i) {
          <p-card>
            <ng-template pTemplate="header">
              <div class="p-4 border-b border-surface-200">
                <p-skeleton width="10rem" height="1.25rem" />
              </div>
            </ng-template>
            <div class="h-[300px] flex items-center justify-center">
              <p-skeleton width="100%" height="250px" />
            </div>
          </p-card>
        }
      </div>
    } @else {
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Win Rate Trend Chart -->
        <p-card>
          <ng-template pTemplate="header">
            <div class="p-4 border-b border-surface-200">
              <h4 class="font-semibold">{{ 'all.club.winRateTrend' | translate }}</h4>
            </div>
          </ng-template>
          <p-chart type="line" [data]="service.winRateChartData()" [options]="chartOptions" height="300" />
        </p-card>

        <!-- Team Performance Comparison -->
        <p-card>
          <ng-template pTemplate="header">
            <div class="p-4 border-b border-surface-200">
              <h4 class="font-semibold">{{ 'all.club.teamComparison' | translate }}</h4>
            </div>
          </ng-template>
          <p-chart type="bar" [data]="service.teamComparisonChartData()" [options]="chartOptions" height="300" />
        </p-card>

        <!-- Games Distribution -->
        <p-card>
          <ng-template pTemplate="header">
            <div class="p-4 border-b border-surface-200">
              <h4 class="font-semibold">{{ 'all.club.gamesDistribution' | translate }}</h4>
            </div>
          </ng-template>
          <p-chart type="doughnut" [data]="service.gamesDistributionChartData()" [options]="doughnutChartOptions" height="300" />
        </p-card>

        <!-- Seasonal Performance -->
        <p-card>
          <ng-template pTemplate="header">
            <div class="p-4 border-b border-surface-200">
              <h4 class="font-semibold">{{ 'all.club.seasonalPerformance' | translate }}</h4>
            </div>
          </ng-template>
          <p-chart type="radar" [data]="service.seasonalPerformanceChartData()" [options]="radarChartOptions" height="300" />
        </p-card>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubPerformanceTabComponent {
  readonly service = inject(ClubPerformanceTabService);

  clubId = input.required<string>();
  season = input.required<number>();

  // Chart options
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        enabled: true,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 10,
        }
      }
    }
  };

  doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      }
    }
  };

  radarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
      }
    }
  };

  constructor() {
    effect(() => {
      this.service.setClubId(this.clubId());
    });

    effect(() => {
      this.service.setSeason(this.season());
    });
  }
}
