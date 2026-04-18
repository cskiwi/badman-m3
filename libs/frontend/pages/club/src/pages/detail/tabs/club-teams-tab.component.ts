import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SkeletonModule } from 'primeng/skeleton';
import { Team } from '@app/models';
import { AuthService } from '@app/frontend-modules-auth/service';
import { ClubTeamsTabService, TeamGenderFilter } from './club-teams-tab.service';
import { TeamCardComponent } from '../../../components/team-card';
import { TeamFilterBarComponent } from '../../../components/team-filter-bar';

@Component({
  selector: 'app-club-teams-tab',
  standalone: true,
  imports: [TranslateModule, SkeletonModule, TeamCardComponent, TeamFilterBarComponent],
  providers: [ClubTeamsTabService],
  templateUrl: './club-teams-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubTeamsTabComponent {
  readonly service = inject(ClubTeamsTabService);
  private readonly auth = inject(AuthService);

  clubId = input.required<string>();
  season = input.required<number>();
  canEditTeamFn = input.required<(team: Team) => boolean>();

  editTeamClicked = output<Team>();

  /** Currently logged-in player id (null when signed out). Highlights the user's own row on team cards. */
  readonly ownPlayerId = computed<string | null>(() => this.auth.user()?.id ?? null);

  constructor() {
    effect(() => {
      this.service.setClubId(this.clubId());
    });

    effect(() => {
      this.service.setSeason(this.season());
    });
  }

  onFilterChange(filter: TeamGenderFilter) {
    this.service.genderFilter.set(filter);
  }
}
