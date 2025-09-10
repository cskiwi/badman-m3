import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Game } from '@app/models';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { GameStatus } from '@app/models-enum';

@Component({
  selector: 'app-draw-games',
  imports: [DatePipe, TranslateModule, CardModule, TagModule, DividerModule],
  templateUrl: './draw-games.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawGamesComponent {
  games = input.required<Game[]>();

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

  getWinnerIndicator(game: Game, teamIndex: number): boolean {
    return game.winner === teamIndex + 1;
  }

  isBye(game: Game): boolean {
    return game.set1Team1 === null && game.set1Team2 === null && 
           game.set2Team1 === null && game.set2Team2 === null && 
           game.set3Team1 === null && game.set3Team2 === null;
  }

  getTeamScores(game: Game): string[] {
    const team1Sets: number[] = [];
    const team2Sets: number[] = [];
    
    if (game.set1Team1 !== null && game.set1Team2 !== null) {
      team1Sets.push(game.set1Team1!);
      team2Sets.push(game.set1Team2!);
    }
    if (game.set2Team1 !== null && game.set2Team2 !== null) {
      team1Sets.push(game.set2Team1!);
      team2Sets.push(game.set2Team2!);
    }
    if (game.set3Team1 !== null && game.set3Team2 !== null) {
      team1Sets.push(game.set3Team1!);
      team2Sets.push(game.set3Team2!);
    }
    
    const team1Score = team1Sets.join(' - ') || '-';
    const team2Score = team2Sets.join(' - ') || '-';

    return [team1Score, team2Score];
  }

  getSetScores(game: Game): { team1Sets: number[], team2Sets: number[] } {
    const team1Sets: number[] = [];
    const team2Sets: number[] = [];
    
    if (game.set1Team1 !== null && game.set1Team2 !== null) {
      team1Sets.push(game.set1Team1!);
      team2Sets.push(game.set1Team2!);
    }
    if (game.set2Team1 !== null && game.set2Team2 !== null) {
      team1Sets.push(game.set2Team1!);
      team2Sets.push(game.set2Team2!);
    }
    if (game.set3Team1 !== null && game.set3Team2 !== null) {
      team1Sets.push(game.set3Team1!);
      team2Sets.push(game.set3Team2!);
    }
    
    return { team1Sets, team2Sets };
  }
}
