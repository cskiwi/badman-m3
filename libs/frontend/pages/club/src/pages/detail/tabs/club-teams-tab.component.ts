import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SkeletonModule } from 'primeng/skeleton';
import { Team } from '@app/models';
import { ClubTeamsTabService } from './club-teams-tab.service';
import { TeamCardComponent } from '../../../components/team-card';

@Component({
  selector: 'app-club-teams-tab',
  standalone: true,
  imports: [TranslateModule, SkeletonModule, TeamCardComponent],
  providers: [ClubTeamsTabService],
  template: `
    @if (service.loading()) {
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <div class="rounded-border bg-highlight p-4 space-y-3">
            <div class="flex items-center justify-between">
              <p-skeleton width="8rem" height="1.25rem" />
              <p-skeleton width="3rem" height="1rem" borderRadius="1rem" />
            </div>
            <div class="space-y-2">
              <p-skeleton width="6rem" height="1rem" />
              <p-skeleton width="7rem" height="1rem" />
              <p-skeleton width="5rem" height="1rem" />
            </div>
            <div class="flex gap-2">
              <p-skeleton width="4rem" height="0.75rem" borderRadius="1rem" />
              <p-skeleton width="3rem" height="0.75rem" borderRadius="1rem" />
            </div>
          </div>
        }
      </div>
    } @else if (service.teams().length > 0) {
      <div class="grid gap-4 md:grid-cols-3 lg:grid-cols-4 sm:grid-cols-2">
        @for (team of service.teams(); track team.id) {
          <app-team-card
            [team]="team"
            [canEdit]="canEditTeamFn()(team)"
            (editClicked)="editTeamClicked.emit($event)"
          />
        }
      </div>
    } @else {
      <div class="text-center py-8 text-surface-500">
        <i class="pi pi-users text-4xl mb-2 block"></i>
        <p>{{ 'all.team.noTeams' | translate }}</p>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubTeamsTabComponent {
  readonly service = inject(ClubTeamsTabService);

  clubId = input.required<string>();
  season = input.required<number>();
  canEditTeamFn = input.required<(team: Team) => boolean>();

  editTeamClicked = output<Team>();

  constructor() {
    effect(() => {
      this.service.setClubId(this.clubId());
    });

    effect(() => {
      this.service.setSeason(this.season());
    });
  }
}
