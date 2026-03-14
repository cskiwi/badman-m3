import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { injectParams } from 'ngxtension/inject-params';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { TournamentLiveService, GameUpdate } from '../../services';

@Component({
  selector: 'app-page-live-courts',
  standalone: true,
  imports: [NgClass, DatePipe, TranslateModule, CardModule, TagModule, ProgressBarModule],
  templateUrl: './page-live-courts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageLiveCourtsComponent implements OnDestroy {
  protected readonly liveService = inject(TournamentLiveService);
  private readonly tournamentId = injectParams('tournamentId');

  // Local state combining court statuses with game data
  readonly courts = computed(() => this.liveService.courtStatuses());
  readonly gamesMap = computed(() => {
    const games = this.liveService.gamesInProgress();
    const map = new Map<string, GameUpdate>();
    games.forEach((g) => map.set(g.gameId, g));
    return map;
  });
  readonly stats = computed(() => this.liveService.tournamentStats());

  constructor() {
    // Connect when tournament ID is available
    effect(() => {
      const id = this.tournamentId();
      if (id) {
        this.liveService.connectToTournament(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.liveService.disconnect();
  }
}
