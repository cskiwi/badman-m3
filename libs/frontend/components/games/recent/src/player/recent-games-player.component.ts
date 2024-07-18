import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recent-games-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-games-player.component.html',
  styleUrl: './recent-games-player.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentGamesPlayerComponent {
  for = input.required<string | string[]>();

}
