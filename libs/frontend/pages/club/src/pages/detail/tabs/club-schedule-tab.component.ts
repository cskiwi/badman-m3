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
  template: `
    @if (service.loading()) {
      <div class="grid gap-6">
        @for (i of [1, 2]; track i) {
          <p-card>
            <ng-template pTemplate="header">
              <div class="p-4 border-b border-surface-200">
                <p-skeleton width="10rem" height="1.25rem"></p-skeleton>
              </div>
            </ng-template>
            <div class="space-y-4 p-4">
              @for (j of [1, 2, 3]; track j) {
                <div class="flex items-center gap-4">
                  <p-skeleton width="4rem" height="1rem"></p-skeleton>
                  <p-skeleton width="8rem" height="1rem"></p-skeleton>
                  <p-skeleton width="2rem" height="1rem"></p-skeleton>
                  <p-skeleton width="8rem" height="1rem"></p-skeleton>
                </div>
              }
            </div>
          </p-card>
        }
      </div>
    } @else if (teamIds().length > 0) {
      <div class="grid gap-6">
        <!-- Recent Games -->
        <p-card>
          <ng-template pTemplate="header">
            <div class="p-4 border-b border-surface-200">
              <h4 class="font-semibold flex items-center gap-2">
                <i class="pi pi-history text-primary-500"></i>
                {{ 'all.game.recent.title' | translate }}
              </h4>
            </div>
          </ng-template>
          <app-recent-games [for]="teamIds()" [type]="'team'" />
        </p-card>

        <!-- Upcoming Games -->
        <p-card>
          <ng-template pTemplate="header">
            <div class="p-4 border-b border-surface-200">
              <h4 class="font-semibold flex items-center gap-2">
                <i class="pi pi-calendar text-primary-500"></i>
                {{ 'all.game.upcoming.title' | translate }}
              </h4>
            </div>
          </ng-template>
          <app-upcoming-games [for]="teamIds()" [type]="'team'" />
        </p-card>
      </div>
    } @else {
      <div class="text-center py-8 text-surface-500">
        <i class="pi pi-calendar text-4xl mb-2 block"></i>
        <p>{{ 'all.team.noTeams' | translate }}</p>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
