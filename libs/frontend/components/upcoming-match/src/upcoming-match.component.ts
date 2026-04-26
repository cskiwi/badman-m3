import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UpcomingMatchData } from './upcoming-match.model';

@Component({
  selector: 'app-upcoming-match',
  templateUrl: './upcoming-match.component.html',
  styleUrl: './upcoming-match.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingMatchComponent {
  match = input.required<UpcomingMatchData>();
}
