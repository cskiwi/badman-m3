import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upcoming-games-team',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upcoming-games-team.component.html',
  styleUrl: './upcoming-games-team.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingGamesTeamComponent {
  for = input.required<string | string[]>();

}
