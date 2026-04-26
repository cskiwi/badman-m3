import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-tier-badge',
  templateUrl: './tier-badge.component.html',
  styleUrl: './tier-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TierBadgeComponent {
  level = input.required<number | string>();
  size = input<'default' | 'sm'>('default');
  label = input<string>();
}
