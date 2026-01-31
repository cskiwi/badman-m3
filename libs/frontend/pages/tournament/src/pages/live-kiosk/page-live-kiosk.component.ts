import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { injectParams } from 'ngxtension/inject-params';
import { TranslateModule } from '@ngx-translate/core';
import { TagModule } from 'primeng/tag';
import { TournamentLiveService, GameUpdate } from '../../services';
import { interval, Subscription } from 'rxjs';

type KioskView = 'courts' | 'results' | 'upcoming' | 'announcements';

@Component({
  selector: 'app-page-live-kiosk',
  standalone: true,
  imports: [DatePipe, TranslateModule, TagModule],
  template: `
    <div class="kiosk-container">
      <!-- Header with clock and connection status -->
      <header class="kiosk-header">
        <div class="tournament-name">
          {{ 'all.tournament.live.tournament' | translate }}
        </div>
        <div class="header-right">
          <div class="current-time">{{ currentTime() }}</div>
          <div class="connection-indicator">
            @if (liveService.isConnected()) {
              <span class="connected"><i class="pi pi-wifi"></i> Live</span>
            } @else {
              <span class="disconnected"><i class="pi pi-times"></i> Offline</span>
            }
          </div>
        </div>
      </header>

      <!-- Main content area -->
      <main class="kiosk-content">
        @switch (currentView()) {
          @case ('courts') {
            <section class="view-courts">
              <h2>{{ 'all.tournament.live.nowPlaying' | translate }}</h2>
              <div class="courts-grid">
                @for (court of courts(); track court.courtId) {
                  <div class="court-tile {{ court.status }}">
                    <div class="court-name">{{ court.courtName }}</div>
                    @if (court.currentGameId && gamesMap().get(court.currentGameId); as game) {
                      <div class="game-score">
                        <div class="team-row">
                          <span class="team-name" [class.winner]="game.winner === 1">Team 1</span>
                          <span class="scores">
                            {{ game.set1Team1 ?? '-' }} | {{ game.set2Team1 ?? '-' }} | {{ game.set3Team1 ?? '-' }}
                          </span>
                        </div>
                        <div class="team-row">
                          <span class="team-name" [class.winner]="game.winner === 2">Team 2</span>
                          <span class="scores">
                            {{ game.set1Team2 ?? '-' }} | {{ game.set2Team2 ?? '-' }} | {{ game.set3Team2 ?? '-' }}
                          </span>
                        </div>
                      </div>
                    } @else {
                      <div class="court-status-text">
                        @switch (court.status) {
                          @case ('available') {
                            {{ 'all.tournament.live.available' | translate }}
                          }
                          @case ('blocked') {
                            {{ 'all.tournament.live.blocked' | translate }}
                          }
                          @default {
                            -
                          }
                        }
                      </div>
                    }
                  </div>
                } @empty {
                  <div class="no-data">{{ 'all.tournament.live.noCourts' | translate }}</div>
                }
              </div>
            </section>
          }

          @case ('results') {
            <section class="view-results">
              <h2>{{ 'all.tournament.live.recentResults' | translate }}</h2>
              <div class="results-list">
                @for (game of recentGames(); track game.gameId; let i = $index) {
                  <div class="result-row" [class.latest]="i === 0">
                    <div class="result-teams">
                      <span [class.winner]="game.winner === 1">Team 1</span>
                      <span class="vs">vs</span>
                      <span [class.winner]="game.winner === 2">Team 2</span>
                    </div>
                    <div class="result-score">
                      {{ game.set1Team1 }}-{{ game.set1Team2 }}
                      @if (game.set2Team1 !== undefined) {
                        , {{ game.set2Team1 }}-{{ game.set2Team2 }}
                      }
                      @if (game.set3Team1 !== undefined) {
                        , {{ game.set3Team1 }}-{{ game.set3Team2 }}
                      }
                    </div>
                    @if (game.endTime) {
                      <div class="result-time">{{ game.endTime | date:'HH:mm' }}</div>
                    }
                  </div>
                } @empty {
                  <div class="no-data">{{ 'all.tournament.live.noResultsYet' | translate }}</div>
                }
              </div>
            </section>
          }

          @case ('upcoming') {
            <section class="view-upcoming">
              <h2>{{ 'all.tournament.live.comingUp' | translate }}</h2>
              @if (stats(); as stats) {
                <div class="games-remaining">
                  {{ stats.gamesRemaining }} {{ 'all.tournament.live.gamesRemaining' | translate }}
                </div>
              }
              <div class="upcoming-placeholder">
                {{ 'all.tournament.live.checkSchedule' | translate }}
              </div>
            </section>
          }

          @case ('announcements') {
            <section class="view-announcements">
              <h2>{{ 'all.tournament.live.announcements' | translate }}</h2>
              <div class="announcements-list">
                @for (announcement of liveService.announcements(); track announcement.timestamp) {
                  <div class="announcement-item {{ announcement.type }}">
                    <div class="announcement-icon">
                      @switch (announcement.type) {
                        @case ('urgent') {
                          <i class="pi pi-exclamation-triangle"></i>
                        }
                        @case ('warning') {
                          <i class="pi pi-exclamation-circle"></i>
                        }
                        @default {
                          <i class="pi pi-info-circle"></i>
                        }
                      }
                    </div>
                    <div class="announcement-text">{{ announcement.message }}</div>
                    <div class="announcement-time">{{ announcement.timestamp | date:'HH:mm' }}</div>
                  </div>
                } @empty {
                  <div class="no-data">{{ 'all.tournament.live.noAnnouncements' | translate }}</div>
                }
              </div>
            </section>
          }
        }
      </main>

      <!-- Stats bar at bottom -->
      @if (stats(); as stats) {
        <footer class="kiosk-footer">
          <div class="stat-item">
            <span class="stat-value">{{ stats.gamesInProgress }}</span>
            <span class="stat-label">{{ 'all.tournament.live.inProgress' | translate }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.gamesCompleted }}</span>
            <span class="stat-label">{{ 'all.tournament.live.completed' | translate }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.gamesRemaining }}</span>
            <span class="stat-label">{{ 'all.tournament.live.remaining' | translate }}</span>
          </div>
          <div class="view-indicator">
            <span class="dot {{ currentView() === 'courts' ? 'active' : '' }}"></span>
            <span class="dot {{ currentView() === 'results' ? 'active' : '' }}"></span>
            <span class="dot {{ currentView() === 'upcoming' ? 'active' : '' }}"></span>
            @if (liveService.announcements().length > 0) {
              <span class="dot {{ currentView() === 'announcements' ? 'active' : '' }}"></span>
            }
          </div>
        </footer>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
      }

      .kiosk-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #1a1a2e;
        color: #ffffff;
        font-family: 'Inter', 'Segoe UI', sans-serif;
      }

      .kiosk-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 2rem;
        background: #16213e;
        border-bottom: 2px solid #0f3460;

        .tournament-name {
          font-size: 1.75rem;
          font-weight: 700;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .current-time {
          font-size: 2rem;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }

        .connection-indicator {
          .connected {
            color: #00ff88;
          }
          .disconnected {
            color: #ff4444;
          }

          i {
            margin-right: 0.5rem;
          }
        }
      }

      .kiosk-content {
        flex: 1;
        padding: 2rem;
        overflow: hidden;

        h2 {
          margin: 0 0 1.5rem;
          font-size: 2rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #e94560;
        }
      }

      .courts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
      }

      .court-tile {
        padding: 1.5rem;
        border-radius: 12px;
        background: #16213e;
        border: 2px solid #0f3460;

        &.in_progress {
          border-color: #00ff88;
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
        }

        &.available {
          border-color: #4a90e2;
        }

        &.blocked {
          border-color: #ff8c00;
          opacity: 0.7;
        }

        .court-name {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #e94560;
        }

        .game-score {
          .team-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #0f3460;

            &:last-child {
              border-bottom: none;
            }

            .team-name {
              font-size: 1.1rem;

              &.winner {
                color: #00ff88;
                font-weight: 700;
              }
            }

            .scores {
              font-size: 1.25rem;
              font-weight: 600;
              font-variant-numeric: tabular-nums;
            }
          }
        }

        .court-status-text {
          font-size: 1.25rem;
          color: #888;
          text-align: center;
          padding: 1rem;
        }
      }

      .results-list {
        .result-row {
          display: flex;
          align-items: center;
          padding: 1rem 1.5rem;
          margin-bottom: 0.75rem;
          background: #16213e;
          border-radius: 8px;
          border-left: 4px solid #0f3460;

          &.latest {
            border-left-color: #00ff88;
            background: linear-gradient(90deg, rgba(0, 255, 136, 0.1), transparent);
          }

          .result-teams {
            flex: 1;
            font-size: 1.25rem;

            .winner {
              color: #00ff88;
              font-weight: 700;
            }

            .vs {
              margin: 0 1rem;
              color: #666;
            }
          }

          .result-score {
            font-size: 1.5rem;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            margin-right: 2rem;
          }

          .result-time {
            color: #888;
            font-size: 1rem;
          }
        }
      }

      .view-upcoming {
        .games-remaining {
          font-size: 1.5rem;
          margin-bottom: 2rem;
          color: #4a90e2;
        }

        .upcoming-placeholder {
          font-size: 1.25rem;
          color: #888;
          text-align: center;
          padding: 3rem;
        }
      }

      .announcements-list {
        .announcement-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.5rem;
          margin-bottom: 1rem;
          border-radius: 8px;
          background: #16213e;

          &.urgent {
            background: linear-gradient(90deg, rgba(255, 68, 68, 0.2), #16213e);
            border-left: 4px solid #ff4444;

            .announcement-icon i {
              color: #ff4444;
            }
          }

          &.warning {
            background: linear-gradient(90deg, rgba(255, 140, 0, 0.2), #16213e);
            border-left: 4px solid #ff8c00;

            .announcement-icon i {
              color: #ff8c00;
            }
          }

          &.info {
            border-left: 4px solid #4a90e2;

            .announcement-icon i {
              color: #4a90e2;
            }
          }

          .announcement-icon i {
            font-size: 1.5rem;
          }

          .announcement-text {
            flex: 1;
            font-size: 1.25rem;
          }

          .announcement-time {
            color: #888;
          }
        }
      }

      .no-data {
        font-size: 1.5rem;
        color: #666;
        text-align: center;
        padding: 3rem;
      }

      .kiosk-footer {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 4rem;
        padding: 1.5rem 2rem;
        background: #16213e;
        border-top: 2px solid #0f3460;

        .stat-item {
          text-align: center;

          .stat-value {
            display: block;
            font-size: 2.5rem;
            font-weight: 700;
            color: #e94560;
          }

          .stat-label {
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #888;
          }
        }

        .view-indicator {
          display: flex;
          gap: 0.5rem;

          .dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #333;
            transition: background 0.3s ease;

            &.active {
              background: #e94560;
            }
          }
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
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
