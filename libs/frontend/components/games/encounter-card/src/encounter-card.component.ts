import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CompetitionEncounter } from '@app/models';
import { DayjsFormatPipe } from '@app/frontend-utils/dayjs/fmt';
import { TranslateModule } from '@ngx-translate/core';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-encounter-card',
  standalone: true,
  imports: [DayjsFormatPipe, TranslateModule, SkeletonModule, RouterModule],
  templateUrl: './encounter-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterCardComponent {
  encounter = input.required<CompetitionEncounter>();
  onLoadGames = input<(encounterId: string) => Promise<void>>();
  variant = input<'played' | 'upcoming'>('played');

  protected expanded = signal(false);
  private _gamesLoading = signal(false);

  // Computed properties
  hasGames = computed(() => {
    const encounter = this.encounter();
    const onLoadGames = this.onLoadGames();

    // Show chevron if games exist, or if games can be loaded (even if they were loaded as empty array)
    return encounter.games !== null || (onLoadGames !== undefined && onLoadGames !== null);
  });

  games = computed(() => {
    const encounter = this.encounter();
    if (encounter.games !== null && encounter.games !== undefined) {
      // Sort games by their order field
      return encounter.games.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return [];
  });

  gamesLoading = computed(() => this._gamesLoading());

  hasSetScores(game: any): boolean {
    return (
      (game.set1Team1 !== null && game.set1Team2 !== null) ||
      (game.set2Team1 !== null && game.set2Team2 !== null) ||
      (game.set3Team1 !== null && game.set3Team2 !== null) ||
      game.winner !== null
    );
  }

  isWinnerTeam(game: any, team: number): boolean {
    return game.winner !== null && game.winner !== 0 && game.winner === team;
  }

  isSetPlayed(score1: number | null | undefined, score2: number | null | undefined): boolean {
    return score1 !== null && score1 !== undefined && score1 > 0 && score2 !== null && score2 !== undefined && score2 > 0;
  }

  getSetWinner(score1: number | null | undefined, score2: number | null | undefined): 1 | 2 | null {
    if (!this.isSetPlayed(score1, score2)) return null;
    if ((score1 as number) > (score2 as number)) return 1;
    if ((score2 as number) > (score1 as number)) return 2;
    return null;
  }

  async toggleExpanded(): Promise<void> {
    const isExpanding = !this.expanded();
    this.expanded.set(isExpanding);

    // If expanding and games haven't been loaded yet, trigger loading
    const encounter = this.encounter();
    const onLoadGames = this.onLoadGames();

    if (isExpanding && encounter.games === null && onLoadGames) {
      this._gamesLoading.set(true);
      try {
        await onLoadGames(encounter.id);
        this._gamesLoading.set(false);
      } catch (error) {
        console.error('Failed to load games:', error);
        this._gamesLoading.set(false);
      }
    }
  }
}
