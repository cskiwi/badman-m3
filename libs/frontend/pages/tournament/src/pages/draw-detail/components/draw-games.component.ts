import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Game, GamePlayerMembership } from '@app/models';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { GameStatus, GameType } from '@app/models-enum';
import {
  getSetScores as _getSetScores,
  isBye as _isBye,
  getGameTeamMemberships,
  getWinnerIndicator as _getWinnerIndicator,
  getPlayerLevel as _getPlayerLevel,
} from '@app/utils/comp';

@Component({
  selector: 'app-draw-games',
  imports: [DatePipe, TranslateModule, CardModule, TagModule, DividerModule, RouterModule],
  templateUrl: './draw-games.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawGamesComponent {
  games = input.required<Game[]>();
  teamNumbers = [1, 2] as const;

  getGameStatus(game: Game): 'success' | 'warning' | 'info' {
    if (game.status !== GameStatus.NO_MATCH) return 'success';
    if (game.status === GameStatus.NO_MATCH) return 'warning';
    return 'info';
  }

  getGameScore(game: Game): string {
    const sets: string[] = [];

    if (game.set1Team1 !== null && game.set1Team2 !== null) {
      sets.push(`${game.set1Team1}-${game.set1Team2}`);
    }
    if (game.set2Team1 !== null && game.set2Team2 !== null) {
      sets.push(`${game.set2Team1}-${game.set2Team2}`);
    }
    if (game.set3Team1 !== null && game.set3Team2 !== null) {
      sets.push(`${game.set3Team1}-${game.set3Team2}`);
    }

    return sets.join(', ') || 'Bye';
  }

  getPlayers(game: Game): string[] {
    const memberships = game.gamePlayerMemberships || [];
    const team1 = memberships.filter((m) => m.team === 1);
    const team2 = memberships.filter((m) => m.team === 2);

    const team1Names = team1.map((m) => m.gamePlayer?.fullName || 'Unknown').join(' / ');
    const team2Names = team2.map((m) => m.gamePlayer?.fullName || 'Unknown').join(' / ');

    return [team1Names || '-', team2Names || '-'];
  }

  getTeamMemberships(game: Game, teamNumber: 1 | 2): GamePlayerMembership[] {
    return getGameTeamMemberships(game, teamNumber);
  }

  getPlayerLevel(membership: GamePlayerMembership, gameType?: GameType): number | null {
    return _getPlayerLevel(membership, gameType);
  }

  getWinnerIndicator(game: Game, teamIndex: number): boolean {
    return _getWinnerIndicator(game, teamIndex);
  }

  isBye(game: Game): boolean {
    return _isBye(game);
  }

  getTeamScores(game: Game): string[] {
    const { team1Sets, team2Sets } = _getSetScores(game);

    const team1Score = team1Sets.join(' - ') || '-';
    const team2Score = team2Sets.join(' - ') || '-';

    return [team1Score, team2Score];
  }

  getSetScores(game: Game): { team1Sets: number[]; team2Sets: number[] } {
    return _getSetScores(game);
  }
}
