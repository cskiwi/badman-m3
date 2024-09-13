import { ChangeDetectionStrategy, Component, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerGamesService } from './recent-games-player.service';
import { MomentModule } from 'ngx-moment';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-recent-games-player',
  standalone: true,
  imports: [CommonModule, MomentModule, MatCardModule],
  templateUrl: './recent-games-player.component.html',
  styleUrl: './recent-games-player.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentGamesPlayerComponent {
  for = input.required<string | string[]>();

  private playerGamesService = new PlayerGamesService();

  games = this.playerGamesService.games;
  loading = this.playerGamesService.loading;

  constructor() {
    effect(() => {
      // take the first playerId if multiple are provided
      let id = this.for();
      if (Array.isArray(id)) {
        id = id[0];
      }

      this.playerGamesService.filter.patchValue({ playerId: id });
    });
  }
}
