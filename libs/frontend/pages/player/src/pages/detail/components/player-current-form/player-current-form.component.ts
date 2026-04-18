import { ChangeDetectionStrategy, Component, computed, effect, input } from '@angular/core';
import { PlayerStatsService } from '../player-stats.service';

@Component({
  selector: 'app-player-current-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './player-current-form.component.html',
  styleUrl: './player-current-form.component.scss',
})
export class PlayerCurrentFormComponent {
  private readonly statsService = new PlayerStatsService();

  readonly playerId = input.required<string>();
  readonly loading = this.statsService.loading;
  readonly form = this.statsService.form;

  readonly wins = computed(() => this.form().filter((f) => f.result === 'W').length);
  readonly losses = computed(() => this.form().filter((f) => f.result === 'L').length);

  constructor() {
    effect(() => {
      this.statsService.filter.get('playerId')?.setValue(this.playerId());
    });
  }
}
