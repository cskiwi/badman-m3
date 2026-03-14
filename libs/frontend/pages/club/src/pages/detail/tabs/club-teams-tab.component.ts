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
  templateUrl: './club-teams-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
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
