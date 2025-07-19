import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';

import { PlayerRecentGamesService } from './recent-games-player.service';
import { MomentModule } from 'ngx-moment';
import { CardModule } from 'primeng/card';
import { IS_MOBILE } from '@app/frontend-utils';
import { ChipModule } from 'primeng/chip';
import { ProgressBarModule } from 'primeng/progressbar';
import { Game } from '@app/models';

@Component({
  selector: 'app-recent-games-player',
  imports: [MomentModule, CardModule, ChipModule, ProgressBarModule],
  templateUrl: './recent-games-player.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentGamesPlayerComponent {
  for = input.required<string | string[]>();
  isMobile = inject(IS_MOBILE);

  private readonly _playerGamesService = new PlayerRecentGamesService();

  games = this._playerGamesService.games;
  loading = this._playerGamesService.loading;

  constructor() {
    effect(() => {
      // take the first playerId if multiple are provided
      let id = this.for();
      if (Array.isArray(id)) {
        id = id[0];
      }

      this._playerGamesService.filter.patchValue({ playerId: id, take: this.isMobile() ? 5 : 10 });
    });
  }

  /**
   * Checks if a set was actually played
   * @param team1Score Score of team 1
   * @param team2Score Score of team 2
   * @returns true if the set was played (both scores are defined)
   */
  isSetPlayed(team1Score: number | undefined, team2Score: number | undefined): boolean {
    return team1Score !== undefined && team2Score !== undefined && team1Score > 0 && team2Score > 0;
  }

  /**
   * Determines which team won a specific set
   * @param team1Score Score of team 1
   * @param team2Score Score of team 2
   * @returns 1 if team 1 won, 2 if team 2 won, 0 if tie
   */
  getSetWinner(team1Score: number | undefined, team2Score: number | undefined): number {
    if (!this.isSetPlayed(team1Score, team2Score)) return 0;
    if ((team1Score ?? 0) > (team2Score ?? 0)) return 1;
    if ((team2Score ?? 0) > (team1Score ?? 0)) return 2;
    return 0;
  }

  /**
   * Determines which team won the overall match
   * @param game The game object
   * @returns 1 if team 1 won, 2 if team 2 won, 0 if tie
   */
  getMatchWinner(game: Game): number {
    let team1Wins = 0;
    let team2Wins = 0;

    // Only count sets that were actually played
    if (this.isSetPlayed(game.set1Team1, game.set1Team2)) {
      const set1Winner = this.getSetWinner(game.set1Team1, game.set1Team2);
      if (set1Winner === 1) team1Wins++;
      if (set1Winner === 2) team2Wins++;
    }

    if (this.isSetPlayed(game.set2Team1, game.set2Team2)) {
      const set2Winner = this.getSetWinner(game.set2Team1, game.set2Team2);
      if (set2Winner === 1) team1Wins++;
      if (set2Winner === 2) team2Wins++;
    }

    if (this.isSetPlayed(game.set3Team1, game.set3Team2)) {
      const set3Winner = this.getSetWinner(game.set3Team1, game.set3Team2);
      if (set3Winner === 1) team1Wins++;
      if (set3Winner === 2) team2Wins++;
    }

    if (team1Wins > team2Wins) return 1;
    if (team2Wins > team1Wins) return 2;
    return 0;
  }

  /**
   * Checks if a player is the current player being viewed
   * @param playerId The player ID to check
   * @returns true if this is the current player
   */
  isCurrentPlayer(playerId: string): boolean {
    const currentPlayerId = Array.isArray(this.for()) ? this.for()[0] : this.for();
    return playerId === currentPlayerId;
  }
}
