import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TierBadgeComponent } from '@app/frontend-components/tier-badge';
import { MatchRowData } from './match-row.model';

@Component({
  selector: 'app-match-row',
  imports: [TierBadgeComponent],
  templateUrl: './match-row.component.html',
  styleUrl: './match-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchRowComponent {
  match = input.required<MatchRowData>();
}
