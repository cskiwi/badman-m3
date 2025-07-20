import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';

import { IS_MOBILE } from '@app/frontend-utils';
import { CompetitionEncounter } from '@app/models';
import { MomentModule } from 'ngx-moment';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ProgressBarModule } from 'primeng/progressbar';
import { PlayerUpcommingGamesService } from './upcoming-games-player.service';

@Component({
  selector: 'app-upcoming-games-player',
  imports: [MomentModule, CardModule, ChipModule, ProgressBarModule],
  templateUrl: './upcoming-games-player.component.html',
  styleUrl: './upcoming-games-player.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingGamesPlayerComponent {
  for = input.required<string | string[]>();
  isMobile = inject(IS_MOBILE);
  

  private playerGamesService = new PlayerUpcommingGamesService();


  games = this.playerGamesService.games;
  loading = this.playerGamesService.loading;

  // constructor() {
  //   effect(() => {
  //     // take the first playerId if multiple are provided
  //     let id = this.for();
  //     if (Array.isArray(id)) {
  //       id = id[0];
  //     }

  //     this.playerGamesService.filter.patchValue({ playerId: id });
  //   });
  // }
}
