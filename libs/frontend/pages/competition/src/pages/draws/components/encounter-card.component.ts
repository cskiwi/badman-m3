import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CompetitionEncounter } from '@app/models';
import { TranslateModule } from '@ngx-translate/core';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-encounter-card',
  standalone: true,
  imports: [DatePipe, TranslateModule, SkeletonModule],
  templateUrl: './encounter-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterCardComponent {
  encounter = input.required<CompetitionEncounter>();
  onLoadGames = input<(encounterId: string) => Promise<void>>();

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
    return (game.set1Team1 !== null && game.set1Team2 !== null) ||
           (game.set2Team1 !== null && game.set2Team2 !== null) ||
           (game.set3Team1 !== null && game.set3Team2 !== null) ||
           game.winner !== null;
  }

  isWinnerTeam(game: any, team: number): boolean {
    return game.winner === team;
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
