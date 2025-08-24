import { Component, effect, inject, input } from '@angular/core';

import { IS_MOBILE } from '@app/frontend-utils';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { PlayerUpcommingGamesService } from './upcoming-games-player.service';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';
import { DayjsFormatPipe } from '@app/frontend-utils/dayjs/fmt';

@Component({
  selector: 'app-upcoming-games-player',
  imports: [DayjsFormatPipe, CardModule, ChipModule, ProgressBarModule, ButtonModule, SkeletonModule, TranslateModule],
  templateUrl: './upcoming-games-player.component.html',
  styleUrls: ['./upcoming-games-player.component.scss'],
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

      this.playerGamesService.filter.patchValue({ playerId: id });
    });
  }
}
