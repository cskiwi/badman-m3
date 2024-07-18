import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIf } from '@angular/common';
import { UpcomingGamesTeamComponent } from './team/upcoming-games-team.component';
import { UpcomingGamesPlayerComponent } from './player/upcoming-games-player.component';

@Component({
  selector: 'app-upcoming-games',
  standalone: true,
  imports: [NgIf, UpcomingGamesPlayerComponent, UpcomingGamesTeamComponent],
  templateUrl: './upcoming-games.component.html',
  styleUrl: './upcoming-games.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingGamesComponent {
  for = input.required<string | string[]>();
  type = input.required<'team' | 'player' >();
}


