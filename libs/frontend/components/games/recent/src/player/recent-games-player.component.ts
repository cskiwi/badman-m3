import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';

import { PlayerRecentGamesService } from './recent-games-player.service';
import { MomentModule } from 'ngx-moment';
import { CardModule } from 'primeng/card';
import { IS_MOBILE } from '@app/frontend-utils';
import { ChipModule } from 'primeng/chip';

@Component({
    selector: 'app-recent-games-player',
    imports: [MomentModule, CardModule, ChipModule],
    templateUrl: './recent-games-player.component.html',
    styleUrl: './recent-games-player.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentGamesPlayerComponent {
  for = input.required<string | string[]>();
  isMobile = inject(IS_MOBILE);

  private readonly _playerGamesService = new PlayerRecentGamesService();

  games = this._playerGamesService.games;
  loading = this._playerGamesService.loading;

  constructor() {
    effect(() => {
      // take the first playerId if multiple are provided
      let id = this.for();
      if (Array.isArray(id)) {
        id = id[0];
      }

      this._playerGamesService.filter.patchValue({ playerId: id, take: this.isMobile() ? 5 : 10 });
    });
  }
}
