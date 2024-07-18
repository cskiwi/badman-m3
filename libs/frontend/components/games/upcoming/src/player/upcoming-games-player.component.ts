import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upcoming-games-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upcoming-games-player.component.html',
  styleUrl: './upcoming-games-player.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingGamesPlayerComponent {
  for = input.required<string | string[]>();

}
