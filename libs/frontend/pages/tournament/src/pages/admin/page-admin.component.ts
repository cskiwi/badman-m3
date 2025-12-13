import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { AuthService } from '@app/frontend-modules-auth/service';
import { SeoService } from '@app/frontend-modules-seo/service';
import { TournamentPhase } from '@app/models-enum';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { AdminService } from './page-admin.service';
import { SettingsTabComponent } from './tabs/settings/settings-tab.component';
import { EnrollmentsTabComponent } from './tabs/enrollments/enrollments-tab.component';
import { DrawsTabComponent } from './tabs/draws/draws-tab.component';
import { ScheduleTabComponent } from './tabs/schedule/schedule-tab.component';
import { CheckinTabComponent } from './tabs/checkin/checkin-tab.component';

@Component({
  selector: 'app-page-admin',
  standalone: true,
  imports: [
    RouterModule,
    TranslateModule,
    SkeletonModule,
    TabsModule,
    ButtonModule,
    MessageModule,
    ProgressBarModule,
    PageHeaderComponent,
    SettingsTabComponent,
    EnrollmentsTabComponent,
    DrawsTabComponent,
    ScheduleTabComponent,
    CheckinTabComponent,
  ],
  templateUrl: './page-admin.component.html',
  styleUrl: './page-admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageAdminComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly seoService = inject(SeoService);
  private readonly dataService = new AdminService();

  readonly tournamentId = injectParams('tournamentId');
  readonly activeTab = injectQueryParams('tab');

  // Data selectors
  tournament = this.dataService.tournament;
  error = this.dataService.error;
  loading = this.dataService.loading;

  // Tab index mapping
  readonly tabIndexMap: Record<string, number> = {
    settings: 0,
    enrollments: 1,
    draws: 2,
    schedule: 3,
    checkin: 4,
  };

  readonly tabNameMap: Record<number, string> = {
    0: 'settings',
    1: 'enrollments',
    2: 'draws',
    3: 'schedule',
    4: 'checkin',
  };

  // Current active tab index
  activeTabIndex = computed(() => {
    const tab = this.activeTab();
    return tab ? (this.tabIndexMap[tab] ?? 0) : 0;
  });

  // Phase-based tab availability
  canAccessEnrollments = computed(() => {
    const phase = this.tournament()?.phase;
    return phase && phase !== TournamentPhase.DRAFT;
  });

  canAccessDraws = computed(() => {
    const phase = this.tournament()?.phase;
    return (
      phase &&
      [
        TournamentPhase.ENROLLMENT_CLOSED,
        TournamentPhase.DRAWS_MADE,
        TournamentPhase.SCHEDULED,
        TournamentPhase.IN_PROGRESS,
        TournamentPhase.COMPLETED,
      ].includes(phase)
    );
  });

  canAccessSchedule = computed(() => {
    const phase = this.tournament()?.phase;
    return (
      phase &&
      [
        TournamentPhase.DRAWS_MADE,
        TournamentPhase.SCHEDULED,
        TournamentPhase.IN_PROGRESS,
        TournamentPhase.COMPLETED,
      ].includes(phase)
    );
  });

  canAccessCheckin = computed(() => {
    const phase = this.tournament()?.phase;
    return (
      phase && [TournamentPhase.SCHEDULED, TournamentPhase.IN_PROGRESS, TournamentPhase.COMPLETED].includes(phase)
    );
  });

  // Permission check
  canEdit = computed(() => {
    const tournament = this.tournament();
    if (!tournament) return false;
    return this.auth.hasAnyPermission([
      'edit-any:tournament',
      'edit-any:club',
      `${tournament.clubId}_edit:club`,
      `${tournament.clubId}_edit:tournament`,
    ]);
  });

  constructor() {
    // Load tournament data when ID changes
    effect(() => {
      const id = this.tournamentId();
      this.dataService.filter.get('tournamentId')?.setValue(id ?? null);
    });

    // Update SEO
    effect(() => {
      const tournament = this.tournament();
      if (tournament) {
        this.seoService.update({
          seoType: 'generic',
          title: `Admin - ${tournament.name}`,
          description: `Manage tournament ${tournament.name}`,
        });
      }
    });
  }

  onTabChange(index: string | number | undefined) {
    const numIndex = typeof index === 'number' ? index : parseInt(index ?? '0', 10);
    const tabName = this.tabNameMap[numIndex] ?? 'settings';
    this.router.navigate([], {
      queryParams: { tab: tabName },
      queryParamsHandling: 'merge',
    });
  }

  refetchTournament() {
    this.dataService.refetch();
  }

  goBack() {
    const id = this.tournamentId();
    if (id) {
      this.router.navigate(['/tournament', id]);
    } else {
      this.router.navigate(['/tournament']);
    }
  }
}
