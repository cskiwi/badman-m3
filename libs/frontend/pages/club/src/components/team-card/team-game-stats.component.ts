import { ChangeDetectionStrategy, Component, effect, inject, input, OnInit, PLATFORM_ID } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SkeletonModule } from 'primeng/skeleton';
import { TeamCardService } from './team-card.service';

@Component({
  selector: 'app-team-game-stats',
  standalone: true,
  imports: [TranslateModule, SkeletonModule],
  providers: [TeamCardService],
  templateUrl: './team-game-stats.component.html',
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
