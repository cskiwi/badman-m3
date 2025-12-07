import { ChangeDetectionStrategy, Component, computed, input, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { type Game } from '@app/models';
import { FormsModule } from '@angular/forms';

interface PerformanceDataPoint {
  date: string;
  winRate: number;
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
}

interface ChartTimeframe {
  label: string;
  value: 'last30' | 'last90' | 'last180' | 'last365' | 'all';
  days?: number;
}

@Component({
  selector: 'app-player-performance-chart',
  imports: [
    FormsModule,
    TranslateModule,
    CardModule,
    ChartModule,
    SelectModule,
  ],
  template: `
    <div class="space-y-6">
      <!-- Chart Controls -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
            <i class="pi pi-chart-line text-primary-600 dark:text-primary-400 text-lg"></i>
          </div>
          <h3 class="text-xl font-semibold text-surface-900 dark:text-surface-50 m-0">
            {{ 'PERFORMANCE.WIN_RATE_OVER_TIME' | translate }}
          </h3>
        </div>

        <p-select
          [(ngModel)]="selectedTimeframe"
          [options]="timeframeOptions"
          optionLabel="label"
          optionValue="value"
          styleClass="min-w-36"
          (onChange)="updateChartData()">
        </p-select>
      </div>

      <!-- Performance Chart -->
      <p-card class="border border-surface-200 dark:border-surface-700">
        @if (chartData()) {
          <p-chart
            type="line"
            [data]="chartData()"
            [options]="chartOptions"
            [style]="{ height: '400px' }">
          </p-chart>
        } @else {
          <div class="flex flex-col items-center justify-center py-16">
            <i class="pi pi-info-circle text-4xl text-surface-400 dark:text-surface-500 mb-4"></i>
            <p class="text-lg text-surface-500 dark:text-surface-400">
              {{ 'PERFORMANCE.NO_DATA_AVAILABLE' | translate }}
            </p>
          </div>
        }
      </p-card>

      <!-- Performance Stats Grid -->
      <div class="grid gap-4">
        <div class="col-12 md:col-6 lg:col-3">
          <p-card class="h-full border border-surface-200 dark:border-surface-700 hover:shadow-lg transition-all duration-200">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <i class="pi pi-arrow-up text-green-600 dark:text-green-400 text-xl"></i>
              </div>
              <div>
                <div class="text-surface-500 dark:text-surface-400 text-sm">
                  {{ 'PERFORMANCE.PEAK_WIN_RATE' | translate }}
                </div>
                <div class="text-surface-900 dark:text-surface-50 text-2xl font-bold">
                  {{ peakWinRate() }}%
                </div>
              </div>
            </div>
          </p-card>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <p-card class="h-full border border-surface-200 dark:border-surface-700 hover:shadow-lg transition-all duration-200">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <i class="pi pi-minus text-blue-600 dark:text-blue-400 text-xl"></i>
              </div>
              <div>
                <div class="text-surface-500 dark:text-surface-400 text-sm">
                  {{ 'PERFORMANCE.CURRENT_WIN_RATE' | translate }}
                </div>
                <div class="text-surface-900 dark:text-surface-50 text-2xl font-bold">
                  {{ currentWinRate() }}%
                </div>
              </div>
            </div>
          </p-card>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <p-card class="h-full border border-surface-200 dark:border-surface-700 hover:shadow-lg transition-all duration-200">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <i class="pi pi-play-circle text-yellow-600 dark:text-yellow-400 text-xl"></i>
              </div>
              <div>
                <div class="text-surface-500 dark:text-surface-400 text-sm">
                  {{ 'PERFORMANCE.RECENT_GAMES' | translate }}
                </div>
                <div class="text-surface-900 dark:text-surface-50 text-2xl font-bold">
                  {{ recentGamesCount() }}
                </div>
              </div>
            </div>
          </p-card>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <p-card class="h-full border border-surface-200 dark:border-surface-700 hover:shadow-lg transition-all duration-200">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center"
                   [class]="trendDirection() === 'up' ? 'bg-green-100 dark:bg-green-900' : trendDirection() === 'down' ? 'bg-red-100 dark:bg-red-900' : 'bg-gray-100 dark:bg-gray-900'">
                @if (trendDirection() === 'up') {
                  <i class="pi pi-trending-up text-green-600 dark:text-green-400 text-xl"></i>
                } @else if (trendDirection() === 'down') {
                  <i class="pi pi-trending-down text-red-600 dark:text-red-400 text-xl"></i>
                } @else {
                  <i class="pi pi-arrows-h text-gray-600 dark:text-gray-400 text-xl"></i>
                }
              </div>
              <div>
                <div class="text-surface-500 dark:text-surface-400 text-sm">
                  {{ 'PERFORMANCE.TREND' | translate }}
                </div>
                <div class="text-surface-900 dark:text-surface-50 text-2xl font-bold">
                  {{ trendDirection() === 'up' ? '↗' : trendDirection() === 'down' ? '↘' : '→' }}
                </div>
              </div>
            </div>
          </p-card>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerPerformanceChartComponent implements OnInit {
  games = input.required<Game[]>();
  playerId = input.required<string>();

  selectedTimeframe: ChartTimeframe['value'] = 'last90';
  
  timeframeOptions: ChartTimeframe[] = [
    { label: 'Last 30 Days', value: 'last30', days: 30 },
    { label: 'Last 90 Days', value: 'last90', days: 90 },
    { label: 'Last 6 Months', value: 'last180', days: 180 },
    { label: 'Last Year', value: 'last365', days: 365 },
    { label: 'All Time', value: 'all' },
  ];

  chartOptions = {
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label.includes('Win Rate')) {
              return `${label}: ${value.toFixed(1)}%`;
            }
            return `${label}: ${value}`;
          }
        }
      }
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        },
        grid: {
          display: false
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Win Rate (%)'
        },
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Games Played'
        },
        min: 0,
        grid: {
          drawOnChartArea: false,
        },
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6
      },
      line: {
        tension: 0.1
      }
    }
  };

  // Computed data
  filteredGames = computed(() => {
    const games = this.games().filter(game => 
      game.status === 'NORMAL' && game.playedAt
    );
    
    const timeframe = this.selectedTimeframe;
    if (timeframe === 'all') {
      return games;
    }
    
    const selectedOption = this.timeframeOptions.find(opt => opt.value === timeframe);
    if (!selectedOption?.days) {
      return games;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - selectedOption.days);
    
    return games.filter(game => 
      new Date(game.playedAt!) >= cutoffDate
    );
  });

  performanceData = computed(() => {
    const games = this.filteredGames();
    if (games.length === 0) {
      return [];
    }

    // Group games by week for better visualization
    const weeklyData = new Map<string, PerformanceDataPoint>();
    
    games.forEach(game => {
      const gameDate = new Date(game.playedAt!);
      const weekStart = new Date(gameDate);
      weekStart.setDate(gameDate.getDate() - gameDate.getDay()); // Start of week
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          date: weekKey,
          totalGames: 0,
          gamesWon: 0,
          gamesLost: 0,
          winRate: 0
        });
      }
      
      const weekData = weeklyData.get(weekKey)!;
      weekData.totalGames++;
      
      if (this.isPlayerWinner(game)) {
        weekData.gamesWon++;
      } else {
        weekData.gamesLost++;
      }
      
      weekData.winRate = weekData.totalGames > 0 
        ? (weekData.gamesWon / weekData.totalGames) * 100 
        : 0;
    });

    // Calculate cumulative win rate
    let cumulativeGames = 0;
    let cumulativeWins = 0;

    return Array.from(weeklyData.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(week => {
        cumulativeGames += week.totalGames;
        cumulativeWins += week.gamesWon;
        return {
          ...week,
          winRate: cumulativeGames > 0 ? (cumulativeWins / cumulativeGames) * 100 : 0
        };
      });
  });

  chartData = computed(() => {
    const data = this.performanceData();
    if (data.length === 0) {
      return null;
    }

    return {
      labels: data.map(d => new Date(d.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Win Rate',
          data: data.map(d => d.winRate),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          yAxisID: 'y',
          fill: true,
          tension: 0.1
        },
        {
          label: 'Games per Week',
          data: data.map(d => d.totalGames),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          yAxisID: 'y1',
          type: 'bar' as const,
          borderWidth: 1
        }
      ]
    };
  });

  // Statistics
  peakWinRate = computed(() => {
    const data = this.performanceData();
    if (data.length === 0) return 0;
    return Math.max(...data.map(d => d.winRate)).toFixed(1);
  });

  currentWinRate = computed(() => {
    const data = this.performanceData();
    if (data.length === 0) return 0;
    return data[data.length - 1]?.winRate.toFixed(1) || '0';
  });

  recentGamesCount = computed(() => {
    return this.filteredGames().length;
  });

  trendDirection = computed(() => {
    const data = this.performanceData();
    if (data.length < 2) return 'stable';
    
    const recent = data.slice(-3); // Last 3 data points
    if (recent.length < 2) return 'stable';
    
    const firstRate = recent[0].winRate;
    const lastRate = recent[recent.length - 1].winRate;
    
    if (lastRate > firstRate + 5) return 'up';
    if (lastRate < firstRate - 5) return 'down';
    return 'stable';
  });

  ngOnInit() {
    this.updateChartData();
  }

  updateChartData() {
    // Force recalculation by updating computed signals
    // The computed signals will automatically recalculate
  }

  private isPlayerWinner(game: Game): boolean {
    const playerId = this.playerId();
    const membership = game.gamePlayerMemberships?.find(
      gpm => gpm.gamePlayer.id === playerId
    );
    const playerTeam = membership ? membership.team : null;
    return playerTeam !== null && game.winner === playerTeam;
  }
}