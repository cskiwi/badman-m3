import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RecentGamesComponent } from '@app/frontend-components/games/recent';
import { UpcomingGamesComponent } from '@app/frontend-components/games/upcoming';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { SeoService } from '@app/frontend-modules-seo/service';
import { PhoneNumberPipe } from '@app/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { SelectModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { DetailService } from './page-detail.service';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { DialogService } from 'primeng/dynamicdialog';
import { AuthService } from '@app/frontend-modules-auth/service';
import { Team } from '@app/models';
import { TeamEditComponent } from '../../components/team-edit/team-edit.component';
import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { DataViewModule } from 'primeng/dataview';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-page-detail',
  imports: [
    ProgressBarModule,
    ReactiveFormsModule,
    RouterModule,
    SelectModule,
    SkeletonModule,
    TranslateModule,
    PageHeaderComponent,
    RecentGamesComponent,
    UpcomingGamesComponent,
    BadgeModule,
    PhoneNumberPipe,
    ButtonModule,
    CardModule,
    TabsModule,
    DataViewModule,
    TableModule,
    ChartModule,
    TooltipModule,
    InputTextModule,
  ],
  providers: [DialogService],
  templateUrl: './page-detail.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageDetailComponent {
  readonly dataService = new DetailService();
  private readonly seoService = inject(SeoService);
  private readonly clubId = injectParams('clubId');

  // selectors
  club = this.dataService.club;
  teamIds = computed(() => this.teams()?.map((team) => team.id));
  teams = this.dataService.teams;
  teamsLoading = this.dataService.teamsLoading;
  currentSeason = this.dataService.currentSeason;
  availableSeasons = this.dataService.availableSeasons;
  clubStats = this.dataService.clubStats;
  statsLoading = this.dataService.statsLoading;

  error = this.dataService.error;
  loading = this.dataService.loading;

  private readonly auth = inject(AuthService);

  // Track expanded teams
  expandedTeams = new Set<string>();

  // Form control getters
  get seasonControl() {
    return this.dataService.filter.get('season') as FormControl<number>;
  }

  toggleTeamPlayers(teamId: string) {
    if (this.expandedTeams.has(teamId)) {
      this.expandedTeams.delete(teamId);
    } else {
      this.expandedTeams.add(teamId);
    }
  }

  isTeamExpanded(teamId: string): boolean {
    return this.expandedTeams.has(teamId);
  }

  private readonly dialogService = inject(DialogService);

  canEditTeam(team: Team): boolean {
    return this.auth.hasAnyPermission(['edit-any:team', 'edit-any:club', `${team.id}_edit:team`]);
  }

  editTeam(team: Team): void {
    const ref = this.dialogService.open(TeamEditComponent, {
      header: 'Edit Team',
      data: { team },
      width: '90%',
      maximizable: true,
      style: { maxWidth: '800px' }
    });

    ref?.onClose.subscribe((updatedTeam: Team | undefined) => {
      if (updatedTeam) {
        // Optionally refresh the data or update local state
        this.dataService.filter.get('clubId')?.setValue(this.clubId());
      }
    });
  }

  // Chart data and options
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

  // Club statistics and data
  establishedYear = computed(() => {
    // Mock data - replace with actual data from service
    return new Date().getFullYear() - 10;
  });

  totalTeams = computed(() => {
    return this.teams().length;
  });

  totalPlayers = computed(() => {
    return this.allPlayers().length;
  });

  allPlayers = computed(() => {
    // Flatten all players from all teams
    const players: any[] = [];
    this.teams().forEach(team => {
      team.teamPlayerMemberships?.forEach(membership => {
        if (membership.player) {
          players.push({
            ...membership.player,
            team: team
          });
        }
      });
    });
    return players;
  });

  clubStatsComputed = computed(() => {
    const serviceStats = this.clubStats();
    const teams = this.teams();
    
    // Combine service data with computed values
    return {
      totalGames: serviceStats?.totalGames || teams.length * 15,
      winRate: serviceStats?.winRate || Math.round(Math.random() * 40 + 40),
      averageRanking: serviceStats?.averageRanking || Math.floor(Math.random() * 50) + 1,
      activeSeasons: this.availableSeasons().length,
      rankingProgress: Math.round((serviceStats?.winRate || 50)),
      seasonProgress: Math.round(Math.random() * 100)
    };
  });

  // Chart data computations
  winRateChartData = computed(() => {
    const seasons = this.availableSeasons().map(s => s.label);
    const data = seasons.map(() => Math.round(Math.random() * 40 + 40));
    
    return {
      labels: seasons,
      datasets: [{
        label: 'Win Rate %',
        data: data,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      }]
    };
  });

  teamComparisonChartData = computed(() => {
    const teams = this.teams().slice(0, 6); // Show top 6 teams
    return {
      labels: teams.map(team => team.name),
      datasets: [{
        label: 'Games Won',
        data: teams.map(() => Math.floor(Math.random() * 15) + 5),
        backgroundColor: '#10B981',
      }, {
        label: 'Games Lost',
        data: teams.map(() => Math.floor(Math.random() * 10) + 2),
        backgroundColor: '#EF4444',
      }]
    };
  });

  gamesDistributionChartData = computed(() => {
    const wins = Math.floor(Math.random() * 50) + 30;
    const losses = Math.floor(Math.random() * 30) + 15;
    const draws = Math.floor(Math.random() * 10) + 5;
    
    return {
      labels: ['Wins', 'Losses', 'Draws'],
      datasets: [{
        data: [wins, losses, draws],
        backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
        hoverBackgroundColor: ['#059669', '#DC2626', '#D97706']
      }]
    };
  });

  seasonalPerformanceChartData = computed(() => {
    return {
      labels: ['Attack', 'Defense', 'Teamwork', 'Consistency', 'Strategy', 'Endurance'],
      datasets: [{
        label: 'Current Season',
        data: [75, 68, 82, 71, 79, 73],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
      }, {
        label: 'Previous Season',
        data: [68, 72, 76, 69, 74, 71],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
      }]
    };
  });

  // Helper methods for player and team statistics
  getTeamStats(teamId: string) {
    // Mock stats - replace with actual data
    return {
      gamesPlayed: Math.floor(Math.random() * 20) + 10,
      wins: Math.floor(Math.random() * 15) + 5,
      losses: Math.floor(Math.random() * 10) + 2
    };
  }

  getTeamWinRate(teamId: string): number {
    const stats = this.getTeamStats(teamId);
    return Math.round((stats.wins / stats.gamesPlayed) * 100);
  }

  getPlayerStats(playerId: string) {
    // Mock stats - replace with actual data
    return {
      gamesPlayed: Math.floor(Math.random() * 25) + 10,
      wins: Math.floor(Math.random() * 20) + 5,
      losses: Math.floor(Math.random() * 10) + 2
    };
  }

  getPlayerWinRate(playerId: string): number {
    const stats = this.getPlayerStats(playerId);
    return Math.round((stats.wins / stats.gamesPlayed) * 100);
  }

  getPlayerRanking(playerId: string): number | null {
    // Mock ranking - replace with actual data
    return Math.floor(Math.random() * 100) + 1;
  }

  getPlayerRankingChange(playerId: string): number {
    // Mock ranking change - replace with actual data
    return Math.floor(Math.random() * 21) - 10; // -10 to +10
  }

  getRankingSeverity(ranking: number | null): 'success' | 'info' | 'warn' | 'danger' {
    if (!ranking) return 'info';
    if (ranking <= 10) return 'success';
    if (ranking <= 25) return 'info';
    if (ranking <= 50) return 'warn';
    return 'danger';
  }

  constructor() {
    effect(() => {
      const clubId = this.clubId();
      if (clubId) {
        this.dataService.filter.get('clubId')?.setValue(clubId);
      }
    });

    effect(() => {
      const club = this.club();
      if (club) {
        this.seoService.update({
          seoType: 'club',
          club,
        });
      }
    });
  }
}
