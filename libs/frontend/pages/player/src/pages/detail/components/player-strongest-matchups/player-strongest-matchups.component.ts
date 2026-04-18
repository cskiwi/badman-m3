import { ChangeDetectionStrategy, Component, effect, input } from '@angular/core';
import { TierBadgeComponent } from '@app/frontend-components/tier-badge';
import { PlayerStatsService } from '../player-stats.service';

@Component({
  selector: 'app-player-strongest-matchups',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TierBadgeComponent],
  templateUrl: './player-strongest-matchups.component.html',
  styleUrl: './player-strongest-matchups.component.scss',
})
export class PlayerStrongestMatchupsComponent {
  private readonly statsService = new PlayerStatsService();

  readonly playerId = input.required<string>();
  readonly opponents = this.statsService.strongestOpponents;
  readonly loading = this.statsService.loading;

  constructor() {
    effect(() => {
      this.statsService.filter.get('playerId')?.setValue(this.playerId());
    });
  }
}
