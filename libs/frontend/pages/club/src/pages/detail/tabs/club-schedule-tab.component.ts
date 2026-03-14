import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { RecentGamesComponent } from '@app/frontend-components/games/recent';
import { UpcomingGamesComponent } from '@app/frontend-components/games/upcoming';
import { ClubTeamsTabService } from './club-teams-tab.service';

@Component({
  selector: 'app-club-schedule-tab',
  standalone: true,
  providers: [ClubTeamsTabService],
  imports: [
    TranslateModule,
    CardModule,
    SkeletonModule,
    RecentGamesComponent,
    UpcomingGamesComponent,
  ],
  templateUrl: './club-schedule-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClubScheduleTabComponent {
  readonly service = inject(ClubTeamsTabService);

  clubId = input.required<string>();
  season = input.required<number>();

  teamIds = computed(() => this.service.teams().map(team => team.id));

  constructor() {
    effect(() => {
      this.service.setClubId(this.clubId());
    });

    effect(() => {
      this.service.setSeason(this.season());
    });
  }
}
