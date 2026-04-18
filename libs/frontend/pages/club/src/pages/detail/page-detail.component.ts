import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HeroComponent } from '@app/frontend-components/hero';
import { AuthService } from '@app/frontend-modules-auth/service';
import { SeoService } from '@app/frontend-modules-seo/service';
import { Team } from '@app/models';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogService } from 'primeng/dynamicdialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { TeamEditComponent } from '../../components/team-edit/team-edit.component';
import { ClubScheduleCardComponent } from '../../components/club-schedule-card';
import { ClubTopPerformersCardComponent } from '../../components/club-top-performers-card';
import { ClubInfoCardComponent } from '../../components/club-info-card';
import { DetailService } from './page-detail.service';
import {
  ClubScheduleTabComponent,
  ClubTeamsTabComponent,
  ClubTournamentsTabComponent,
  ClubPlayersTabComponent,
  ClubTeamBuilderTabComponent,
} from './tabs';

@Component({
  selector: 'app-page-detail',
  imports: [
    CommonModule,
    RouterModule,
    ProgressBarModule,
    ReactiveFormsModule,
    SelectModule,
    ButtonModule,
    TranslateModule,
    CardModule,
    TabsModule,
    HeroComponent,
    ClubTeamsTabComponent,
    ClubPlayersTabComponent,
    ClubScheduleTabComponent,
    ClubTournamentsTabComponent,
    ClubTeamBuilderTabComponent,
    ClubScheduleCardComponent,
    ClubTopPerformersCardComponent,
    ClubInfoCardComponent,
  ],
  providers: [DialogService],
  templateUrl: './page-detail.component.html',
  styleUrl: './page-detail.component.scss',
})
export class PageDetailComponent {
  readonly dataService = new DetailService();
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);
  private readonly clubId = injectParams('clubId');

  // selectors
  club = this.dataService.club;
  currentSeason = this.dataService.currentSeason;
  availableSeasons = this.dataService.availableSeasons;
  stats = this.dataService.stats;
  teams = this.dataService.teams;
  teamCount = this.dataService.teamCount;

  /** Distinct league/type buckets across the club's teams (M/W/Mix). */
  readonly teamLeagueCount = computed(() => {
    const types = new Set(this.teams().map((t) => t.type).filter(Boolean));
    return types.size;
  });

  /** Crest text â€” uses abbreviation if present, otherwise initials of the name. */
  readonly clubCrestText = computed(() => {
    const c = this.club();
    if (!c) return '';
    if (c.abbreviation) return c.abbreviation.slice(0, 4).toUpperCase();
    const source = c.fullName || c.name || '';
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  });









  error = this.dataService.error;
  loading = this.dataService.loading;

  private readonly auth = inject(AuthService);

  // Form control getters
  get seasonControl() {
    return this.dataService.filter.get('season') as FormControl<number>;
  }

  private readonly dialogService = inject(DialogService);

  canEditTeam(team: Team): boolean {
    return this.auth.hasAnyPermission(['edit-any:team', 'edit-any:club', `${team.id}_edit:team`]);
  }

  canAccessTeamBuilder(): boolean {
    const clubId = this.clubId();
    return this.auth.hasAnyPermission(['edit-any:club', `${clubId}_edit:club`]);
  }

  canCreateTournament(): boolean {
    const clubId = this.clubId();
    return this.auth.hasAnyPermission(['create-any:tournament', 'edit-any:club', `${clubId}_edit:club`, `${clubId}_create:tournament`]);
  }

  createTournament(): void {
    const clubId = this.clubId();
    // Navigate to tournament creation page with club context
    this.router.navigate(['/tournament', 'create'], { queryParams: { clubId } });
  }

  editTeam(team: Team): void {
    const ref = this.dialogService.open(TeamEditComponent, {
      header: 'Edit Team',
      data: { team },
      width: '90%',
      maximizable: true,
      style: { maxWidth: '800px' },
    });

    ref?.onClose.subscribe((updatedTeam: Team | undefined) => {
      if (updatedTeam) {
        // Refresh club data
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
