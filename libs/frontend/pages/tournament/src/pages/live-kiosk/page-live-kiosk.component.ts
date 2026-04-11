import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { injectParams } from 'ngxtension/inject-params';
import { TranslateModule } from '@ngx-translate/core';
import { TagModule } from 'primeng/tag';
import { TournamentLiveService, GameUpdate } from '../../services';
import { interval, Subscription } from 'rxjs';

type KioskView = 'courts' | 'results' | 'upcoming' | 'announcements';

@Component({
  selector: 'app-page-live-kiosk',
  standalone: true,
  imports: [NgClass, DatePipe, TranslateModule, TagModule],
  templateUrl: './page-live-kiosk.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageLiveKioskComponent implements OnDestroy {
  protected readonly liveService = inject(TournamentLiveService);
  private readonly tournamentId = injectParams('tournamentId');

  // View cycling
  private readonly views: KioskView[] = ['courts', 'results', 'upcoming'];
  private readonly viewIndex = signal(0);
  private viewCycleSubscription?: Subscription;
  private clockSubscription?: Subscription;

  readonly currentView = computed(() => {
    const hasAnnouncements = this.liveService.announcements().length > 0;
    const allViews = hasAnnouncements ? [...this.views, 'announcements' as KioskView] : this.views;
    return allViews[this.viewIndex() % allViews.length];
  });

  readonly currentTime = signal(this.formatTime());

  readonly courts = computed(() => this.liveService.courtStatuses());
  readonly gamesMap = computed(() => {
    const games = this.liveService.gamesInProgress();
    const map = new Map<string, GameUpdate>();
    games.forEach((g) => map.set(g.gameId, g));
    return map;
  });
  readonly recentGames = computed(() => this.liveService.recentCompletedGames().slice(0, 8));
  readonly stats = computed(() => this.liveService.tournamentStats());

  constructor() {
    // Connect when tournament ID is available
    effect(() => {
      const id = this.tournamentId();
      if (id) {
        this.liveService.connectToTournament(id);
      }
    });

    // Cycle views every 15 seconds
    this.viewCycleSubscription = interval(15000).subscribe(() => {
      this.viewIndex.update((i) => i + 1);
    });

    // Update clock every second
    this.clockSubscription = interval(1000).subscribe(() => {
      this.currentTime.set(this.formatTime());
    });
  }

  private formatTime(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  ngOnDestroy(): void {
    this.liveService.disconnect();
    this.viewCycleSubscription?.unsubscribe();
    this.clockSubscription?.unsubscribe();
  }
}
