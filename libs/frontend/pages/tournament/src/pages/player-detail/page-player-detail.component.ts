import { DatePipe, DecimalPipe, SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { SeoService } from '@app/frontend-modules-seo/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import { PlayerDetailService } from './page-player-detail.service';
import { PlayerStatisticsCardComponent } from './components/player-statistics-card.component';
import { PlayerGamesTableComponent } from './components/player-games-table.component';
import { PlayerTournamentHistoryComponent } from './components/player-tournament-history.component';
import { PlayerPerformanceChartComponent } from './components/player-performance-chart.component';
import { PlayerHeadToHeadComponent } from './components/player-head-to-head.component';
import { PlayerAvatarComponent } from './components/player-avatar.component';

@Component({
  selector: 'app-page-player-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    SlicePipe,
    ProgressBarModule,
    RouterModule,
    TranslateModule,
    PageHeaderComponent,
    ButtonModule,
    SkeletonModule,
    CardModule,
    TabsModule,
    BreadcrumbModule,
    PlayerStatisticsCardComponent,
    PlayerGamesTableComponent,
    PlayerTournamentHistoryComponent,
    PlayerPerformanceChartComponent,
    PlayerHeadToHeadComponent,
    PlayerAvatarComponent,
  ],
  templateUrl: './page-player-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagePlayerDetailComponent {
  private readonly dataService = new PlayerDetailService();
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);
  readonly playerId = injectParams('playerId');

  // Data selectors
  player = this.dataService.player;
  statistics = this.dataService.statistics;
  tournamentHistory = this.dataService.tournamentHistory;
  recentGames = this.dataService.recentGames;
  allGames = this.dataService.allGames;

  error = this.dataService.error;
  loading = this.dataService.loading;

  // Breadcrumb navigation
  breadcrumbItems = computed((): MenuItem[] => {
    const player = this.player();
    if (!player) return [];

    return [
      {
        label: 'Players',
        routerLink: '/players',
        icon: 'pi pi-users',
      },
      {
        label: player.fullName || `${player.firstName} ${player.lastName}`,
        icon: 'pi pi-user',
      },
    ];
  });

  homeItem: MenuItem = {
    icon: 'pi pi-home',
    routerLink: '/',
  };

  // Computed properties for display
  playerDisplayName = computed(() => {
    const player = this.player();
    return player?.fullName || `${player?.firstName || ''} ${player?.lastName || ''}`.trim();
  });

  playerAge = computed(() => {
    const player = this.player();
    if (!player?.birthDate) return null;

    const birthDate = new Date(player.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  });

  // Navigation methods
  goBack() {
    window.history.back();
  }

  constructor() {
    // Initialize service with playerId
    effect(() => {
      const playerId = this.playerId();
      if (playerId) {
        this.dataService.filter.get('playerId')?.setValue(playerId);
      }
    });

    // SEO updates
    effect(() => {
      const player = this.player();
      const statistics = this.statistics();

      if (player && statistics) {
        const displayName = this.playerDisplayName();
        this.seoService.update({
          seoType: 'generic',
          title: `${displayName} - Player Profile`,
          description: `Tournament statistics and game history for ${displayName}. ${statistics.totalGames} games played with ${statistics.winRate.toFixed(1)}% win rate across ${statistics.tournaments} tournaments.`,
        });
      }
    });
  }
}
