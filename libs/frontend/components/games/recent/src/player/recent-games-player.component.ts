import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';

import { IS_MOBILE } from '@app/frontend-utils';
import { Game } from '@app/models';
import { MomentModule } from 'ngx-moment';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ProgressBarModule } from 'primeng/progressbar';
import { PlayerRecentGamesService } from './recent-games-player.service';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-recent-games-player',
  imports: [MomentModule, CardModule, ChipModule, ProgressBarModule, DividerModule],
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

  /**
   * Calculates total points for a team using ranking points
   * @param game The game object
   * @param team Team number (1 or 2)
   * @returns Total points for the team
   */
  getTeamPoints(game: Game, team: number): number {
    if (!game?.gamePlayerMemberships) return 0;

    // Get player IDs for the specified team
    const teamPlayerIds = game.gamePlayerMemberships
      .filter((membership) => membership.team === team)
      .map((membership) => membership.gamePlayer?.id)
      .filter((id) => id !== undefined);

    // Sum ranking points for players in this team
    return game.rankingPoints?.filter((rankingPoint) => teamPlayerIds.includes(rankingPoint.playerId))
      .reduce((total, rankingPoint) => total + (rankingPoint.points || 0), 0) || 0;
  }

  /**
   * Gets ranking points for a specific player in a game
   * @param game The game object
   * @param playerId The player ID
   * @returns Ranking points for the player or 0 if not found
   */
  getPlayerPoints(game: Game, playerId: string): number {
    if (!game?.rankingPoints) return 0;

    const rankingPoint = game.rankingPoints.find((rp) => rp.playerId === playerId);
    return rankingPoint?.points || 0;
  }

  /**
   * Determines if a team gained or lost points
   * @param game The game object
   * @param team Team number (1 or 2)
   * @returns 'gain' | 'loss' | 'neutral'
   */
  getPointsDirection(game: Game, team: number): 'gain' | 'loss' | 'neutral' {
    const points = this.getTeamPoints(game, team);
    if (points > 0) return 'gain';
    if (points < 0) return 'loss';
    return 'neutral';
  }

  /**
   * Gets the appropriate icon for points change
   * @param game The game object
   * @param team Team number (1 or 2)
   * @returns Icon class string
   */
  getPointsIcon(game: Game, team: number): string {
    const direction = this.getPointsDirection(game, team);
    switch (direction) {
      case 'gain': return 'pi pi-arrow-up';
      case 'loss': return 'pi pi-arrow-down';
      default: return 'pi pi-minus';
    }
  }

  /**
   * Gets the appropriate color class for points
   * @param game The game object
   * @param team Team number (1 or 2)
   * @returns Color class string
   */
  getPointsColorClass(game: Game, team: number): string {
    const direction = this.getPointsDirection(game, team);
    switch (direction) {
      case 'gain': return 'text-green-600 dark:text-green-400';
      case 'loss': return 'text-red-600 dark:text-red-400';
      default: return 'text-color-secondary';
    }
  }

  /**
   * Formats points with appropriate prefix
   * @param points The points value
   * @returns Formatted string with + or - prefix
   */
  formatPoints(points: number): string {
    if (points > 0) return `+${points}`;
    if (points < 0) return `${points}`;
    return `${points}`;
  }

  /**
   * Gets the magnitude description for points change
   * @param points The points value
   * @returns Description of the points change magnitude
   */
  getPointsMagnitude(points: number): 'small' | 'medium' | 'large' {
    const absPoints = Math.abs(points);
    if (absPoints === 0) return 'small';
    if (absPoints <= 10) return 'small';
    if (absPoints <= 25) return 'medium';
    return 'large';
  }

  /**
   * Gets a simplified styling class for points badge
   * @param game The game object
   * @param team Team number (1 or 2)
   * @returns CSS class for enhanced styling
   */
  getPointsEnhancedStyling(game: Game, team: number): string {
    // This method is kept for backward compatibility but styling is now handled in CSS
    return '';
  }
}
