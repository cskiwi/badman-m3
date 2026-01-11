import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { injectParams } from 'ngxtension/inject-params';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { TournamentLiveService, GameUpdate } from '../../services';

@Component({
  selector: 'app-page-live-courts',
  standalone: true,
  imports: [DatePipe, TranslateModule, CardModule, TagModule, ProgressBarModule],
  template: `
    <div class="live-courts-container">
      <header class="live-header">
        <h1>{{ 'all.tournament.live.nowPlaying' | translate }}</h1>
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
        <div class="stats-bar">
          <div class="stat">
            <span class="stat-value">{{ stats.gamesInProgress }}</span>
            <span class="stat-label">{{ 'all.tournament.live.inProgress' | translate }}</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ stats.gamesCompleted }}</span>
            <span class="stat-label">{{ 'all.tournament.live.completed' | translate }}</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ stats.gamesRemaining }}</span>
            <span class="stat-label">{{ 'all.tournament.live.remaining' | translate }}</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ stats.courtsInUse }}/{{ stats.courtsInUse + stats.courtsAvailable }}</span>
            <span class="stat-label">{{ 'all.tournament.live.courtsInUse' | translate }}</span>
          </div>
        </div>
      }

      <div class="courts-grid">
        @for (court of courts(); track court.courtId) {
          <p-card styleClass="court-card {{ court.status }}">
            <ng-template #header>
              <div class="court-header">
                <h2>{{ court.courtName }}</h2>
                @switch (court.status) {
                  @case ('in_progress') {
                    <p-tag severity="success" value="{{ 'all.tournament.live.playing' | translate }}" />
                  }
                  @case ('available') {
                    <p-tag severity="info" value="{{ 'all.tournament.live.available' | translate }}" />
                  }
                  @case ('blocked') {
                    <p-tag severity="warn" value="{{ 'all.tournament.live.blocked' | translate }}" />
                  }
                }
              </div>
            </ng-template>

            @if (court.currentGameId && gamesMap().get(court.currentGameId); as game) {
              <div class="game-info">
                <div class="teams">
                  <div class="team" [class.winner]="game.winner === 1">
                    <span class="team-name">Team 1</span>
                  </div>
                  <div class="vs">vs</div>
                  <div class="team" [class.winner]="game.winner === 2">
                    <span class="team-name">Team 2</span>
                  </div>
                </div>

                <div class="score-display">
                  @if (game.set1Team1 !== undefined) {
                    <div class="set">
                      <span class="set-score">{{ game.set1Team1 }} - {{ game.set1Team2 }}</span>
                    </div>
                  }
                  @if (game.set2Team1 !== undefined) {
                    <div class="set">
                      <span class="set-score">{{ game.set2Team1 }} - {{ game.set2Team2 }}</span>
                    </div>
                  }
                  @if (game.set3Team1 !== undefined) {
                    <div class="set">
                      <span class="set-score">{{ game.set3Team1 }} - {{ game.set3Team2 }}</span>
                    </div>
                  }
                </div>

                @if (game.startTime) {
                  <div class="game-time">
                    <span>{{ 'all.tournament.live.startedAt' | translate }}: {{ game.startTime | date:'HH:mm' }}</span>
                  </div>
                }
              </div>
            } @else if (court.status === 'available') {
              <div class="court-empty">
                <p>{{ 'all.tournament.live.courtAvailable' | translate }}</p>
              </div>
            } @else if (court.status === 'blocked') {
              <div class="court-blocked">
                <p>{{ 'all.tournament.live.courtBlocked' | translate }}</p>
              </div>
            }
          </p-card>
        } @empty {
          <div class="no-courts">
            <p>{{ 'all.tournament.live.noCourts' | translate }}</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .live-courts-container {
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

      .stats-bar {
        display: flex;
        justify-content: space-around;
        gap: 1rem;
        margin-bottom: 2rem;
        padding: 1rem;
        background: var(--surface-card);
        border-radius: var(--border-radius);
        box-shadow: var(--card-shadow);

        .stat {
          text-align: center;

          .stat-value {
            display: block;
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary-color);
          }

          .stat-label {
            display: block;
            font-size: 0.875rem;
            color: var(--text-color-secondary);
          }
        }
      }

      .courts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
      }

      :host ::ng-deep .court-card {
        &.in_progress {
          border-left: 4px solid var(--green-500);
        }
        &.available {
          border-left: 4px solid var(--blue-500);
        }
        &.blocked {
          border-left: 4px solid var(--orange-500);
        }
      }

      .court-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: var(--surface-100);

        h2 {
          margin: 0;
          font-size: 1.25rem;
        }
      }

      .game-info {
        padding: 1rem;
      }

      .teams {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;

        .team {
          flex: 1;
          text-align: center;
          padding: 0.5rem;

          &.winner {
            background: var(--green-100);
            border-radius: var(--border-radius);
          }

          .team-name {
            font-weight: 600;
          }
        }

        .vs {
          padding: 0 1rem;
          color: var(--text-color-secondary);
          font-weight: 500;
        }
      }

      .score-display {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 1rem;

        .set {
          padding: 0.5rem 1rem;
          background: var(--surface-100);
          border-radius: var(--border-radius);

          .set-score {
            font-size: 1.5rem;
            font-weight: 700;
          }
        }
      }

      .game-time {
        text-align: center;
        color: var(--text-color-secondary);
        font-size: 0.875rem;
      }

      .court-empty,
      .court-blocked {
        padding: 2rem;
        text-align: center;
        color: var(--text-color-secondary);
      }

      .no-courts {
        grid-column: 1 / -1;
        padding: 3rem;
        text-align: center;
        color: var(--text-color-secondary);
      }
    `,
  ],
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
