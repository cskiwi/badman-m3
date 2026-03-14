import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { injectParams } from 'ngxtension/inject-params';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { TournamentLiveService } from '../../services';

@Component({
  selector: 'app-page-live-results',
  standalone: true,
  imports: [DatePipe, TranslateModule, CardModule, TagModule, TableModule],
  templateUrl: './page-live-results.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageLiveResultsComponent implements OnDestroy {
  protected readonly liveService = inject(TournamentLiveService);
  private readonly tournamentId = injectParams('tournamentId');

  recentGames = computed(() => this.liveService.recentCompletedGames());

  constructor() {
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
