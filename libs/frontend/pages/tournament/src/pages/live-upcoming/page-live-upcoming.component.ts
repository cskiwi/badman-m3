import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { injectParams } from 'ngxtension/inject-params';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TournamentLiveService } from '../../services';

interface UpcomingGame {
  gameId: string;
  courtName?: string;
  scheduledTime?: string;
  team1?: string;
  team2?: string;
  category?: string;
  round?: string;
}

@Component({
  selector: 'app-page-live-upcoming',
  standalone: true,
  imports: [NgClass, DatePipe, TranslateModule, CardModule, TagModule],
  templateUrl: './page-live-upcoming.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageLiveUpcomingComponent implements OnDestroy {
  protected readonly liveService = inject(TournamentLiveService);
  private readonly tournamentId = injectParams('tournamentId');

  // Placeholder for upcoming games - in real implementation, would fetch from schedule
  private readonly _upcomingGames = signal<UpcomingGame[]>([]);

  upcomingGames = computed(() => this._upcomingGames());
  stats = computed(() => this.liveService.tournamentStats());

  constructor() {
    effect(() => {
      const id = this.tournamentId();
      if (id) {
        this.liveService.connectToTournament(id);
      }
    });

    // Listen for schedule updates
    this.liveService.onScheduleUpdated((update) => {
      // Would refetch upcoming games when schedule changes
      console.log('Schedule updated:', update);
    });
  }

  ngOnDestroy(): void {
    this.liveService.disconnect();
  }
}
