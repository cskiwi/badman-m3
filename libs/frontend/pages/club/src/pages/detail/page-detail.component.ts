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
  ],
  providers: [DialogService],
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
  teamIds = computed(() => this.teams()?.map((team) => team.id));
  teams = this.dataService.teams;
  teamsLoading = this.dataService.teamsLoading;
  currentSeason = this.dataService.currentSeason;
  availableSeasons = this.dataService.availableSeasons;

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

    ref.onClose.subscribe((updatedTeam: Team | undefined) => {
      if (updatedTeam) {
        // Optionally refresh the data or update local state
        this.dataService.filter.get('clubId')?.setValue(this.clubId());
      }
    });
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
