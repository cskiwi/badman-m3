import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CompetitionEncounter, Game } from '@app/models';
import { TranslateModule } from '@ngx-translate/core';
import { SkeletonModule } from 'primeng/skeleton';
import { TierBadgeComponent } from '@app/frontend-components/tier-badge';

type Variant = 'played' | 'upcoming';

@Component({
  selector: 'app-encounter-card',
  standalone: true,
  imports: [DatePipe, TranslateModule, SkeletonModule, RouterModule, TierBadgeComponent],
  templateUrl: './encounter-card.component.html',
  styles: [
    `
      :host {
        display: block;
      }
      .enc-card {
        background-color: var(--p-content-background);
        border: 1px solid var(--p-content-border-color);
      }
      .enc-card--clickable:hover {
        background-color: var(--p-content-border-color);
      }
      .enc-expanded {
        background-color: var(--p-content-background);
        border-top: 1px solid var(--p-content-border-color);
      }

      /* Game card — Arena style (matches recent-games-player layout) */
      .g-card {
        display: grid;
        grid-template-columns: 4px auto 1fr auto;
        background: var(--p-content-background);
        border: 1px solid var(--p-content-border-color);
        border-radius: 0.75rem;
        overflow: hidden;
      }
      .g-card__band {
        background: var(--p-content-border-color);
      }
      .g-card--win .g-card__band {
        background: var(--g-win);
      }
      .g-card--loss .g-card__band {
        background: var(--g-loss);
      }
      .g-card__type {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 12px 14px 12px 16px;
        border-right: 1px solid var(--p-content-border-color);
        min-width: 56px;
      }
      .g-card__type-label {
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--p-text-muted-color);
        line-height: 1;
      }
      .g-card__type-order {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.625rem;
        color: var(--p-text-muted-color);
      }
      .g-card__body {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 4px;
        min-width: 0;
        padding: 12px 16px;
      }
      .g-card__pairs {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 10px;
        align-items: center;
      }
      .g-card__pair {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .g-card__pair.is-right {
        align-items: flex-end;
        text-align: right;
      }
      .g-card__pair .player {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.875rem;
        color: var(--p-text-muted-color);
        max-width: 100%;
      }
      .g-card__pair.is-winner .player {
        color: var(--p-text-color);
        font-weight: 600;
      }
      .g-card__pair .player .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .g-card__pair .player a.name {
        color: inherit;
        text-decoration: none;
      }
      .g-card__pair .player a.name:hover {
        color: var(--p-primary-color);
      }
      .g-card__vs {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.6875rem;
        color: var(--p-text-muted-color);
        text-transform: uppercase;
        letter-spacing: 0.14em;
      }
      .g-card__right {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px 16px;
        border-left: 1px solid var(--p-content-border-color);
      }
      .g-card__scores {
        display: flex;
        gap: 10px;
        font-family: 'JetBrains Mono', monospace;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        line-height: 1.1;
      }
      .g-card__score-col {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        min-width: 1.25rem;
      }
      .g-card__score-col .score {
        font-size: 1rem;
        color: var(--p-text-muted-color);
      }
      .g-card__score-col .score.is-win {
        color: var(--g-win);
      }

      @media (max-width: 640px) {
        .g-card {
          grid-template-columns: 4px auto 1fr auto;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterCardComponent {
  encounter = input.required<CompetitionEncounter>();
  onLoadGames = input<((encounterId: string) => Promise<void>) | undefined | null>(null);
  variant = input<Variant>('played');
  /**
   * Optional list of team IDs to use as "perspective" for win/loss styling.
   * If the encounter's home team is in this list the card is styled from the
   * home perspective; if the away team is in this list it uses the away
   * perspective. When empty the card is rendered without win/loss coloring.
   */
  perspectiveTeamIds = input<string[] | null | undefined>(null);

  protected expanded = signal(false);
  private _gamesLoading = signal(false);

  /** 'home' | 'away' | null */
  readonly perspective = computed<'home' | 'away' | null>(() => {
    const ids = this.perspectiveTeamIds() ?? [];
    if (!ids.length) return null;
    const enc = this.encounter();
    if (enc.homeTeam?.id && ids.includes(enc.homeTeam.id)) return 'home';
    if (enc.awayTeam?.id && ids.includes(enc.awayTeam.id)) return 'away';
    return null;
  });

  readonly ownScore = computed(() => {
    const enc = this.encounter();
    return this.perspective() === 'away' ? (enc.awayScore ?? 0) : (enc.homeScore ?? 0);
  });

  readonly opponentScore = computed(() => {
    const enc = this.encounter();
    return this.perspective() === 'away' ? (enc.homeScore ?? 0) : (enc.awayScore ?? 0);
  });

  /** 'win' | 'loss' | 'draw' | null (null when no perspective) */
  readonly result = computed<'win' | 'loss' | 'draw' | null>(() => {
    if (!this.perspective()) return null;
    const own = this.ownScore();
    const opp = this.opponentScore();
    if (own === opp) return 'draw';
    return own > opp ? 'win' : 'loss';
  });

  hasGames = computed(() => {
    const enc = this.encounter();
    const loader = this.onLoadGames();
    return enc.games != null || loader != null;
  });

  games = computed<Game[]>(() => {
    const enc = this.encounter();
    if (enc.games != null) {
      return enc.games.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return [];
  });

  gamesLoading = computed(() => this._gamesLoading());

  isSetPlayed(score1: number | null | undefined, score2: number | null | undefined): boolean {
    return score1 != null && score2 != null && (score1 > 0 || score2 > 0);
  }

  getSetWinner(score1: number | null | undefined, score2: number | null | undefined): 1 | 2 | null {
    if (!this.isSetPlayed(score1, score2)) return null;
    if ((score1 as number) > (score2 as number)) return 1;
    if ((score2 as number) > (score1 as number)) return 2;
    return null;
  }

  /** Returns the player's level for this game's type (single/double/mix). */
  getPlayerLevel(game: Game, playerId: string | undefined | null): number | null {
    if (!playerId || !game?.gamePlayerMemberships || !game.gameType) return null;
    const m = game.gamePlayerMemberships.find((mm) => mm?.gamePlayer?.id === playerId);
    if (!m) return null;
    switch (game.gameType) {
      case 'S':
        return m.single ?? null;
      case 'D':
        return m.double ?? null;
      case 'MX':
        return m.mix ?? null;
      default:
        return null;
    }
  }

  /**
   * Returns the per-game result from the current perspective.
   * 'win' | 'loss' | null (neutral when no perspective / no winner).
   */
  getGameResult(game: Game): 'win' | 'loss' | null {
    const p = this.perspective();
    if (!p || !game?.winner) return null;
    const ownTeam = p === 'away' ? 2 : 1;
    return game.winner === ownTeam ? 'win' : 'loss';
  }

  async toggleExpanded(): Promise<void> {
    const next = !this.expanded();
    this.expanded.set(next);

    const enc = this.encounter();
    const loader = this.onLoadGames();
    if (next && enc.games == null && loader) {
      this._gamesLoading.set(true);
      try {
        await loader(enc.id);
      } catch (err) {
        console.error('Failed to load games:', err);
      } finally {
        this._gamesLoading.set(false);
      }
    }
  }
}
