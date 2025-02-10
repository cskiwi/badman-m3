import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerRecentGamesService } from './recent-games-player.service';
import { MomentModule } from 'ngx-moment';
import { MatCardModule } from '@angular/material/card';
import { IS_MOBILE } from '@app/frontend-utils';
import { MatChipsModule } from '@angular/material/chips';

@Component({
    selector: 'app-recent-games-player',
    imports: [CommonModule, MomentModule, MatCardModule, MatChipsModule],
    templateUrl: './recent-games-player.component.html',
    styleUrl: './recent-games-player.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentGamesPlayerComponent {
  for = input.required<string | string[]>();
  isMobile = inject(IS_MOBILE);

  private playerGamesService = new PlayerRecentGamesService();

  games = this.playerGamesService.games;
  loading = this.playerGamesService.loading;

  constructor() {
    effect(() => {
      // take the first playerId if multiple are provided
      let id = this.for();
      if (Array.isArray(id)) {
        id = id[0];
      }

      this.playerGamesService.filter.patchValue({ playerId: id, take: this.isMobile() ? 5 : 10 });
    });
  }
}
