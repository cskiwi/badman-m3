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
  ],
  templateUrl: './page-detail.component.html',
  styleUrl: './page-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageDetailComponent {
  readonly dataService = new DetailService();
  private readonly seoService = inject(SeoService);
  private readonly clubId = injectParams('clubId');

  // selectors
  club = this.dataService.club;
  teamIds = computed(() => this.club()?.teams?.map((team) => team.id));
  teams = this.dataService.teams;
  teamsLoading = this.dataService.teamsLoading;
  currentSeason = this.dataService.currentSeason;
  availableSeasons = this.dataService.availableSeasons;

  error = this.dataService.error;
  loading = this.dataService.loading;

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
