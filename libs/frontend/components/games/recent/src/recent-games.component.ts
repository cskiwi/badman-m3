import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIf } from '@angular/common';
import { RecentGamesTeamComponent } from './team/recent-games-team.component';
import { RecentGamesPlayerComponent } from './player/recent-games-player.component';
@Component({
  selector: 'app-recent-games',
  standalone: true,
  imports: [NgIf, RecentGamesPlayerComponent, RecentGamesTeamComponent],
  templateUrl: './recent-games.component.html',
  styleUrl: './recent-games.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentGamesComponent {
  for = input.required<string | string[]>();
  type = input.required<'team' | 'player'>();
}
