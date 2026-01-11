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
  template: `
    <div class="live-results-container">
      <header class="live-header">
        <h1>{{ 'all.tournament.live.recentResults' | translate }}</h1>
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

      <div class="results-list">
        @for (game of recentGames(); track game.gameId; let i = $index) {
          <p-card styleClass="result-card {{ i === 0 ? 'latest' : '' }}">
            <div class="result-content">
              <div class="result-header">
                @if (i === 0) {
                  <p-tag severity="info" value="{{ 'all.tournament.live.justFinished' | translate }}" />
                }
                @if (game.endTime) {
                  <span class="end-time">{{ game.endTime | date:'HH:mm' }}</span>
                }
              </div>

              <div class="teams-result">
                <div class="team" [class.winner]="game.winner === 1">
                  <span class="team-label">Team 1</span>
                  @if (game.winner === 1) {
                    <i class="pi pi-trophy winner-icon"></i>
                  }
                </div>
                <div class="final-score">
                  <div class="sets">
                    @if (game.set1Team1 !== undefined) {
                      <span class="set">{{ game.set1Team1 }}-{{ game.set1Team2 }}</span>
                    }
                    @if (game.set2Team1 !== undefined) {
                      <span class="set">{{ game.set2Team1 }}-{{ game.set2Team2 }}</span>
                    }
                    @if (game.set3Team1 !== undefined) {
                      <span class="set">{{ game.set3Team1 }}-{{ game.set3Team2 }}</span>
                    }
                  </div>
                </div>
                <div class="team" [class.winner]="game.winner === 2">
                  @if (game.winner === 2) {
                    <i class="pi pi-trophy winner-icon"></i>
                  }
                  <span class="team-label">Team 2</span>
                </div>
              </div>
            </div>
          </p-card>
        } @empty {
          <div class="no-results">
            <i class="pi pi-clock"></i>
            <p>{{ 'all.tournament.live.noResultsYet' | translate }}</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .live-results-container {
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

      .results-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      :host ::ng-deep .result-card {
        &.latest {
          border: 2px solid var(--primary-color);
          animation: pulse 2s ease-in-out infinite;
        }
      }

      @keyframes pulse {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(var(--primary-color-rgb), 0.4);
        }
        50% {
          box-shadow: 0 0 0 10px rgba(var(--primary-color-rgb), 0);
        }
      }

      .result-content {
        padding: 1rem;
      }

      .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;

        .end-time {
          color: var(--text-color-secondary);
          font-size: 0.875rem;
        }
      }

      .teams-result {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .team {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border-radius: var(--border-radius);

          &:first-child {
            justify-content: flex-start;
          }

          &:last-child {
            justify-content: flex-end;
          }

          &.winner {
            background: var(--green-100);

            .team-label {
              font-weight: 700;
            }
          }

          .team-label {
            font-size: 1.1rem;
          }

          .winner-icon {
            color: var(--yellow-500);
            font-size: 1.25rem;
          }
        }

        .final-score {
          flex-shrink: 0;
          padding: 0 1.5rem;

          .sets {
            display: flex;
            gap: 0.75rem;

            .set {
              padding: 0.5rem 1rem;
              background: var(--surface-100);
              border-radius: var(--border-radius);
              font-size: 1.25rem;
              font-weight: 700;
            }
          }
        }
      }

      .no-results {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        color: var(--text-color-secondary);

        i {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        p {
          font-size: 1.25rem;
        }
      }
    `,
  ],
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
