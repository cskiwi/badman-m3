import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { injectParams } from 'ngxtension/inject-params';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TournamentLiveService, ScheduleUpdate } from '../../services';

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
  imports: [DatePipe, TranslateModule, CardModule, TagModule],
  template: `
    <div class="live-upcoming-container">
      <header class="live-header">
        <h1>{{ 'all.tournament.live.upcomingGames' | translate }}</h1>
        <div class="connection-status">
          @if (liveService.isConnected()) {
            <p-tag severity="success" value="Live" icon="pi pi-wifi" />
          } @else if (liveService.isConnecting()) {
            <p-tag severity="warn" value="Connecting..." icon="pi pi-spin pi-spinner" />
          } @else {
            <p-tag severity="danger" value="Offline" icon="pi pi-times" />
          }
        </div>
      </header>

      @if (stats(); as stats) {
        <div class="upcoming-summary">
          <p-tag severity="info" value="{{ stats.gamesRemaining }} {{ 'all.tournament.live.gamesRemaining' | translate }}" styleClass="large-tag" />
        </div>
      }

      <div class="upcoming-list">
        @for (game of upcomingGames(); track game.gameId; let i = $index) {
          <p-card styleClass="upcoming-card {{ i < 3 ? 'next-up' : '' }}">
            <div class="upcoming-content">
              <div class="game-position">
                @if (i === 0) {
                  <p-tag severity="success" value="{{ 'all.tournament.live.next' | translate }}" />
                } @else {
                  <span class="position-number">#{{ i + 1 }}</span>
                }
              </div>

              <div class="game-details">
                <div class="matchup">
                  <span class="team">{{ game.team1 || 'TBD' }}</span>
                  <span class="vs">vs</span>
                  <span class="team">{{ game.team2 || 'TBD' }}</span>
                </div>

                @if (game.category || game.round) {
                  <div class="game-meta">
                    @if (game.category) {
                      <span class="category">{{ game.category }}</span>
                    }
                    @if (game.round) {
                      <span class="round">{{ game.round }}</span>
                    }
                  </div>
                }
              </div>

              <div class="game-schedule">
                @if (game.courtName) {
                  <div class="court">
                    <i class="pi pi-map-marker"></i>
                    <span>{{ game.courtName }}</span>
                  </div>
                }
                @if (game.scheduledTime) {
                  <div class="time">
                    <i class="pi pi-clock"></i>
                    <span>{{ game.scheduledTime | date:'HH:mm' }}</span>
                  </div>
                }
              </div>
            </div>
          </p-card>
        } @empty {
          <div class="no-upcoming">
            <i class="pi pi-check-circle"></i>
            <p>{{ 'all.tournament.live.allGamesCompleted' | translate }}</p>
          </div>
        }
      </div>

      @if (liveService.announcements().length > 0) {
        <div class="announcements">
          <h2>{{ 'all.tournament.live.announcements' | translate }}</h2>
          @for (announcement of liveService.announcements(); track announcement.timestamp) {
            <div class="announcement {{ announcement.type }}">
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
              <div class="announcement-content">
                <p>{{ announcement.message }}</p>
                <span class="announcement-time">{{ announcement.timestamp | date:'HH:mm' }}</span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .live-upcoming-container {
        padding: 1rem;
        min-height: 100vh;
        background: var(--surface-ground);
      }

      .live-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--surface-border);

        h1 {
          margin: 0;
          font-size: 2rem;
          color: var(--text-color);
        }
      }

      .upcoming-summary {
        margin-bottom: 1.5rem;
        text-align: center;

        :host ::ng-deep .large-tag {
          font-size: 1.1rem;
          padding: 0.5rem 1rem;
        }
      }

      .upcoming-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      :host ::ng-deep .upcoming-card {
        &.next-up {
          border-left: 4px solid var(--green-500);
        }
      }

      .upcoming-content {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 0.75rem;
      }

      .game-position {
        flex-shrink: 0;
        width: 60px;
        text-align: center;

        .position-number {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-color-secondary);
        }
      }

      .game-details {
        flex: 1;

        .matchup {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.25rem;

          .team {
            font-weight: 600;
            font-size: 1.1rem;
          }

          .vs {
            color: var(--text-color-secondary);
            font-size: 0.875rem;
          }
        }

        .game-meta {
          display: flex;
          gap: 1rem;
          color: var(--text-color-secondary);
          font-size: 0.875rem;

          .category,
          .round {
            &::before {
              content: '•';
              margin-right: 0.5rem;
            }
          }

          .category::before {
            content: '';
            margin-right: 0;
          }
        }
      }

      .game-schedule {
        flex-shrink: 0;
        text-align: right;

        .court,
        .time {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
          color: var(--text-color-secondary);

          i {
            font-size: 0.875rem;
          }
        }

        .court {
          font-weight: 500;
          color: var(--text-color);
        }
      }

      .no-upcoming {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        color: var(--text-color-secondary);

        i {
          font-size: 3rem;
          color: var(--green-500);
          margin-bottom: 1rem;
        }

        p {
          font-size: 1.25rem;
        }
      }

      .announcements {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--surface-border);

        h2 {
          margin: 0 0 1rem;
          font-size: 1.25rem;
        }

        .announcement {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          margin-bottom: 0.75rem;
          border-radius: var(--border-radius);
          background: var(--surface-card);

          &.urgent {
            background: var(--red-100);
            border-left: 4px solid var(--red-500);

            i {
              color: var(--red-500);
            }
          }

          &.warning {
            background: var(--orange-100);
            border-left: 4px solid var(--orange-500);

            i {
              color: var(--orange-500);
            }
          }

          &.info {
            border-left: 4px solid var(--blue-500);

            i {
              color: var(--blue-500);
            }
          }

          i {
            font-size: 1.25rem;
            flex-shrink: 0;
          }

          .announcement-content {
            flex: 1;

            p {
              margin: 0 0 0.25rem;
            }

            .announcement-time {
              font-size: 0.75rem;
              color: var(--text-color-secondary);
            }
          }
        }
      }
    `,
  ],
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
