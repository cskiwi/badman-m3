import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { EncounterCardComponent } from '@app/frontend-components/games/encounter-card';
import { ClubTeamsTabService } from './club-teams-tab.service';
import { ClubScheduleTabService } from './club-schedule-tab.service';

@Component({
  selector: 'app-club-schedule-tab',
  standalone: true,
  providers: [ClubTeamsTabService, ClubScheduleTabService],
  imports: [
    TranslateModule,
    CardModule,
    SkeletonModule,
    EncounterCardComponent,
  ],
  templateUrl: './club-schedule-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClubScheduleTabComponent {
  private readonly teamsService = inject(ClubTeamsTabService);
  readonly scheduleService = inject(ClubScheduleTabService);

  clubId = input.required<string>();
  season = input.required<number>();

  teamIds = computed(() => this.teamsService.teams().map(team => team.id));
  loading = computed(() => this.teamsService.loading() || this.scheduleService.loading());
  playedEncounters = computed(() => this.scheduleService.playedEncounters());
  upcomingEncounters = computed(() => this.scheduleService.upcomingEncounters());

  onLoadGames = async (encounterId: string): Promise<void> => {
    await this.scheduleService.loadEncounterGames(encounterId);
  };

  constructor() {
    effect(() => {
      this.teamsService.setClubId(this.clubId());
    });

    effect(() => {
      this.teamsService.setSeason(this.season());
    });

    effect(() => {
      const ids = this.teamIds();
      if (ids.length > 0) {
        this.scheduleService.setTeamIds(ids);
      }
    });
  }
}
