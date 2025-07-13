import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';

import { PlayerUpcommingGamesService } from './upcoming-games-player.service';
import { IS_MOBILE } from '@app/frontend-utils';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { MomentModule } from 'ngx-moment';

@Component({
    selector: 'app-upcoming-games-player',
    imports: [MomentModule, CardModule, ChipModule],
    templateUrl: './upcoming-games-player.component.html',
    styleUrl: './upcoming-games-player.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpcomingGamesPlayerComponent {
  for = input.required<string | string[]>();
  isMobile = inject(IS_MOBILE);

  private playerGamesService = new PlayerUpcommingGamesService();

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
