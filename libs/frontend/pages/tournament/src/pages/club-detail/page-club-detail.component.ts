import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { SeoService } from '@app/frontend-modules-seo/service';
import { AuthService } from '@app/frontend-modules-auth/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { ClubDetailService } from './page-club-detail.service';

// PrimeNG Components
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressBarModule } from 'primeng/progressbar';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-page-club-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    PageHeaderComponent,
    CardModule,
    TableModule,
    TabsModule,
    SelectModule,
    SkeletonModule,
    ProgressBarModule,
    BadgeModule,
    ButtonModule,
    ChartModule,
    TagModule,
    AvatarModule,
    BreadcrumbModule,
    TooltipModule,
  ],
  templateUrl: './page-club-detail.component.html',
  styleUrl: './page-club-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageClubDetailComponent {
  private readonly dataService = new ClubDetailService();
  private readonly seoService = inject(SeoService);
  private readonly auth = inject(AuthService);
  private readonly clubId = injectParams('clubId');

  // Data selectors
  club = this.dataService.club;
  teams = this.dataService.teams;
  playerRoster = this.dataService.playerRoster;
  tournamentEntries = this.dataService.tournamentEntries;
  statistics = this.dataService.statistics;

  error = this.dataService.error;
  loading = this.dataService.loading;

  // Season management
  currentSeason = this.dataService.currentSeason;
  availableSeasons = this.dataService.availableSeasons;

  // Form control getter
  get seasonControl() {
    return this.dataService.filter.get('season') as FormControl<number>;
  }

  // Breadcrumb items
  breadcrumbItems = computed((): MenuItem[] => {
    const club = this.club();
    return [
      { label: 'Home', routerLink: '/' },
      { label: 'Tournaments', routerLink: '/tournament' },
      { label: 'Clubs', routerLink: '/clubs' },
      { label: club?.name || 'Club Details' },
    ];
  });

  // Performance chart data
  performanceChartData = computed(() => {
    const stats = this.statistics();
    if (!stats) return null;

    return {
      labels: ['Games Won', 'Games Lost'],
      datasets: [
        {
          data: [stats.gamesWon, stats.gamesLost],
          backgroundColor: ['#10b981', '#ef4444'],
          borderColor: ['#059669', '#dc2626'],
          borderWidth: 1,
        },
      ],
    };
  });

  performanceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  // Team distribution chart data
  teamDistributionData = computed(() => {
    const teams = this.teams();
    if (!teams.length) return null;

    const seasonCounts = teams.reduce((acc: any, team) => {
      acc[team.season] = (acc[team.season] || 0) + 1;
      return acc;
    }, {});

    return {
      labels: Object.keys(seasonCounts).sort(),
      datasets: [
        {
          label: 'Teams per Season',
          data: Object.values(seasonCounts),
          backgroundColor: '#3b82f6',
          borderColor: '#1d4ed8',
          borderWidth: 1,
        },
      ],
    };
  });

  // Player table columns
  playerColumns = [
    { field: 'fullName', header: 'Player Name' },
    { field: 'gender', header: 'Gender' },
    { field: 'competitivePlayerIndex', header: 'CPI' },
    { field: 'teams', header: 'Teams' },
  ];

  // Tournament table columns
  tournamentColumns = [
    { field: 'tournament.name', header: 'Tournament' },
    { field: 'tournament.eventType', header: 'Event Type' },
    { field: 'tournament.level', header: 'Level' },
    { field: 'team.name', header: 'Team' },
    { field: 'standing.position', header: 'Position' },
    { field: 'standing.points', header: 'Points' },
  ];

  // Utility methods
  getPlayerInitials(player: any): string {
    if (!player.firstName || !player.lastName) return '??';
    return `${player.firstName.charAt(0)}${player.lastName.charAt(0)}`.toUpperCase();
  }

  getGenderSeverity(gender: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    switch (gender?.toLowerCase()) {
      case 'male':
        return 'info';
      case 'female':
        return 'success';
      case 'mixed':
        return 'warn';
      default:
        return 'danger';
    }
  }

  getEventTypeSeverity(eventType: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    if (eventType?.startsWith('M')) return 'info';
    if (eventType?.startsWith('F')) return 'success';
    if (eventType?.startsWith('MX')) return 'warn';
    return 'danger';
  }

  getTournamentDate(tournament: any): Date | null {
    return tournament?.drawTournaments?.[0]?.tournamentEvent?.firstDay ? new Date(tournament.drawTournaments[0].tournamentEvent.firstDay) : null;
  }

  getPositionSeverity(position: number | null): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    if (!position) return 'danger';
    if (position === 1) return 'success';
    if (position <= 3) return 'info';
    if (position <= 8) return 'warn';
    return 'danger';
  }

  // Track by functions for performance
  trackByPlayerId = (index: number, player: any) => player.id;
  trackByTeamId = (index: number, team: any) => team.id;
  trackByEntryId = (index: number, entry: any) => entry.entry.id;

  constructor() {
    // Set club ID when component loads
    effect(() => {
      const clubId = this.clubId();
      if (clubId) {
        this.dataService.filter.get('clubId')?.setValue(clubId);
      }
    });

    // Update SEO when club data loads
    effect(() => {
      const club = this.club();
      if (club) {
        this.seoService.update({
          seoType: 'generic',
          title: `${club.fullName || club.name} - Club Profile`,
          description: `Tournament profile and statistics for ${club.fullName || club.name}. View player roster, team information, and tournament results.`,
        });
      }
    });
  }
}
