import { ChangeDetectionStrategy, Component, inject, input, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SkeletonModule } from 'primeng/skeleton';
import { TeamCardService } from './team-card.service';

@Component({
  selector: 'app-team-game-stats',
  standalone: true,
  imports: [TranslateModule, SkeletonModule],
  providers: [TeamCardService],
  template: `
    <div class="grid grid-cols-3 gap-2 text-center my-3 border-t border-surface pt-3">
      @if (service.loading()) {
        <div class="p-2">
          <p-skeleton width="2rem" height="1.25rem" class="mx-auto mb-1" />
          <p-skeleton width="3rem" height="0.75rem" class="mx-auto" />
        </div>
        <div class="p-2">
          <p-skeleton width="2rem" height="1.25rem" class="mx-auto mb-1" />
          <p-skeleton width="3rem" height="0.75rem" class="mx-auto" />
        </div>
        <div class="p-2">
          <p-skeleton width="2rem" height="1.25rem" class="mx-auto mb-1" />
          <p-skeleton width="3rem" height="0.75rem" class="mx-auto" />
        </div>
      } @else {
        <div class="p-2">
          <div class="font-bold text-primary-600">{{ service.stats().gamesPlayed }}</div>
          <div class="text-xs text-surface-600">{{ 'all.team.games' | translate }}</div>
        </div>
        <div class="p-2">
          <div class="font-bold text-green-600">{{ service.stats().gamesWon }}</div>
          <div class="text-xs text-surface-600">{{ 'all.team.wins' | translate }}</div>
        </div>
        <div class="p-2">
          <div class="font-bold text-blue-600">{{ service.winRate() }}%</div>
          <div class="text-xs text-surface-600">{{ 'all.team.winRate' | translate }}</div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamGameStatsComponent {
  readonly service = inject(TeamCardService);

  teamId = input.required<string>();

  constructor() {
    effect(() => {
      if (this.teamId()) {
        this.service.setTeamId(this.teamId());
      }
    });
  }

}
