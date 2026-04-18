import { ChangeDetectionStrategy, Component, computed, effect, input } from '@angular/core';
import { PlayerStatsService } from '../player-stats.service';

type Discipline = 'single' | 'double' | 'mix';

@Component({
  selector: 'app-rank-spark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rank-spark.component.html',
  styleUrl: './rank-spark.component.scss',
})
export class RankSparkComponent {
  private readonly statsService = new PlayerStatsService();

  readonly playerId = input.required<string>();
  readonly discipline = input.required<Discipline>();

  readonly loading = this.statsService.loading;

  private readonly trend = computed(() => this.statsService.trendForDiscipline(this.discipline()));

  readonly bars = computed(() => {
    const items = this.trend().bars;
    if (!items.length) return [] as { value: number; result: 'W' | 'L' | 'N'; height: number }[];
    const max = Math.max(1, ...items.map((b) => Math.abs(b.value)));
    return items.map((b) => {
      // Favour readability: losses stay short (20–45%), wins stay tall (65–100%).
      const ratio = Math.abs(b.value) / max;
      const height = b.result === 'W' ? 65 + ratio * 35 : 20 + ratio * 25;
      return { ...b, height: Math.round(height) };
    });
  });

  readonly label = computed(() => `${this.discipline()} trend`);

  constructor() {
    effect(() => {
      this.statsService.filter.get('playerId')?.setValue(this.playerId());
    });
  }
}
