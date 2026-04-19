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
        background-color: var(--p-surface-100);
        border: 1px solid var(--p-surface-200);
      }
      .enc-card--clickable:hover {
        background-color: var(--p-surface-200);
      }
      .enc-expanded {
        background-color: var(--p-surface-50);
        border-top: 1px solid var(--p-surface-200);
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
