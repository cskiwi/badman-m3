import { ChangeDetectionStrategy, Component, computed, input, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { DropdownModule } from 'primeng/dropdown';
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
    DropdownModule,
  ],
  template: `
    <div class="performance-chart-container">
      <!-- Chart Controls -->
      <div class="chart-controls mb-4">
        <div class="flex justify-content-between align-items-center">
          <h3 class="chart-title m-0">
            <i class="pi pi-chart-line mr-2"></i>
            {{ 'PERFORMANCE.WIN_RATE_OVER_TIME' | translate }}
          </h3>
          
          <p-dropdown
            [(ngModel)]="selectedTimeframe"
            [options]="timeframeOptions"
            optionLabel="label"
            optionValue="value"
            [style]="{ 'min-width': '150px' }"
            (onChange)="updateChartData()">
          </p-dropdown>
        </div>
      </div>

      <!-- Performance Chart -->
      <div class="chart-section">
        <p-card>
          @if (chartData()) {
            <p-chart
              type="line"
              [data]="chartData()"
              [options]="chartOptions"
              [style]="{ height: '400px' }">
            </p-chart>
          } @else {
            <div class="no-data-message">
              <i class="pi pi-info-circle text-3xl text-color-secondary"></i>
              <p class="text-lg text-color-secondary mt-2">
                {{ 'PERFORMANCE.NO_DATA_AVAILABLE' | translate }}
              </p>
            </div>
          }
        </p-card>
      </div>

      <!-- Performance Stats Grid -->
      <div class="stats-grid mt-4">
        <div class="grid">
          <div class="col-12 md:col-6 lg:col-3">
            <p-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon trending-up">
                  <i class="pi pi-arrow-up"></i>
                </div>
                <div class="stat-details">
                  <div class="stat-label">{{ 'PERFORMANCE.PEAK_WIN_RATE' | translate }}</div>
                  <div class="stat-value">{{ peakWinRate() }}%</div>
                </div>
              </div>
            </p-card>
          </div>

          <div class="col-12 md:col-6 lg:col-3">
            <p-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon trending-avg">
                  <i class="pi pi-minus"></i>
                </div>
                <div class="stat-details">
                  <div class="stat-label">{{ 'PERFORMANCE.CURRENT_WIN_RATE' | translate }}</div>
                  <div class="stat-value">{{ currentWinRate() }}%</div>
                </div>
              </div>
            </p-card>
          </div>

          <div class="col-12 md:col-6 lg:col-3">
            <p-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon games">
                  <i class="pi pi-play-circle"></i>
                </div>
                <div class="stat-details">
                  <div class="stat-label">{{ 'PERFORMANCE.RECENT_GAMES' | translate }}</div>
                  <div class="stat-value">{{ recentGamesCount() }}</div>
                </div>
              </div>
            </p-card>
          </div>

          <div class="col-12 md:col-6 lg:col-3">
            <p-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon trend" [class.positive]="trendDirection() === 'up'" [class.negative]="trendDirection() === 'down'">
                  @if (trendDirection() === 'up') {
                    <i class="pi pi-trending-up"></i>
                  } @else if (trendDirection() === 'down') {
                    <i class="pi pi-trending-down"></i>
                  } @else {
                    <i class="pi pi-arrows-h"></i>
                  }
                </div>
                <div class="stat-details">
                  <div class="stat-label">{{ 'PERFORMANCE.TREND' | translate }}</div>
                  <div class="stat-value">{{ trendDirection() === 'up' ? '↗' : trendDirection() === 'down' ? '↘' : '→' }}</div>
                </div>
              </div>
            </p-card>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './player-performance-chart.component.scss',
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
      game.status === 'completed' && game.playedAt
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