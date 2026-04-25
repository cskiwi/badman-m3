import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type HeroStatVariant = 'default' | 'rank' | 'win' | 'loss';

/**
 * Large stat number used inside the `[stats]` slot of `<app-hero>`.
 *
 * Variants:
 * - `default` — solid `--p-text-color`
 * - `rank` — gradient text using `--g-gradient-rank`
 * - `win` / `loss` — semantic win/loss color
 */
@Component({
  selector: 'app-hero-stat-value',
  templateUrl: './hero-stat-value.component.html',
  styleUrl: './hero-stat-value.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
  },
})
export class HeroStatValueComponent {
  variant = input<HeroStatVariant>('default');

  protected hostClasses = computed(
    () =>
      `hero-stat-value hero-stat-value--${this.variant()} ` +
      `inline-block font-['Space_Grotesk',sans-serif] font-semibold text-[1.75rem] min-[1100px]:text-[2.5rem] leading-none tracking-tight tabular-nums`,
  );
}
