import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type HeroAvatarVariant = 'primary' | 'rank';

/**
 * Parallelogram-shaped crest with a gradient border and gradient text.
 * Used as the avatar slot inside `<app-hero>`.
 */
@Component({
  selector: 'app-hero-avatar',
  templateUrl: './hero-avatar.component.html',
  styleUrl: './hero-avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
    avatar: '',
  },
})
export class HeroAvatarComponent {
  variant = input<HeroAvatarVariant>('primary');

  protected hostClasses = computed(() => `hero-avatar hero-avatar--${this.variant()}`);
}
