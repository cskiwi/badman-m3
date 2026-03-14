import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';
import { type Game } from '@app/models';

@Component({
  selector: 'app-player-games-table',
  imports: [
    DatePipe,
    RouterModule,
    TranslateModule,
    TableModule,
    TagModule,
    ButtonModule,
    PaginatorModule,
    TooltipModule,
  ],
  templateUrl: './player-games-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerGamesTableComponent {
  games = input.required<Game[]>();
  playerId = input.required<string>();
  showTournamentInfo = input<boolean>(false);
  showPagination = input<boolean>(false);

  getOpponentNames(game: Game): string {
    const playerId = this.playerId();
    const opponents = game.gamePlayerMemberships
      ?.filter(gpm => gpm.gamePlayer.id !== playerId)
      .map(gpm => gpm.gamePlayer.fullName)
      .join(' & ');
    
    return opponents || 'Unknown';
  }

  getPlayerTeam(game: Game): number | null {
    const playerId = this.playerId();
    const membership = game.gamePlayerMemberships?.find(
      gpm => gpm.gamePlayer.id === playerId
    );
    return membership?.team ?? null;
  }

  isPlayerWinner(game: Game): boolean {
    const playerTeam = this.getPlayerTeam(game);
    return playerTeam !== null && game.winner === playerTeam;
  }

  hasScore(game: Game): boolean {
    return game.set1Team1 !== null && game.set1Team2 !== null;
  }

  getPlayerScore(game: Game, setNumber: 1 | 2 | 3): number {
    const playerTeam = this.getPlayerTeam(game);
    if (playerTeam === null) return 0;

    const scoreKey = `set${setNumber}Team${playerTeam}` as keyof Game;
    return (game[scoreKey] as number) || 0;
  }

  getOpponentScore(game: Game, setNumber: 1 | 2 | 3): number {
    const playerTeam = this.getPlayerTeam(game);
    if (playerTeam === null) return 0;

    const opponentTeam = playerTeam === 1 ? 2 : 1;
    const scoreKey = `set${setNumber}Team${opponentTeam}` as keyof Game;
    return (game[scoreKey] as number) || 0;
  }

  isSetWinner(game: Game, setNumber: 1 | 2 | 3): boolean {
    const playerScore = this.getPlayerScore(game, setNumber);
    const opponentScore = this.getOpponentScore(game, setNumber);
    return playerScore > opponentScore;
  }

  getGameLink(game: Game): string[] | null {
    if (!game.tournamentDraw?.tournamentSubEvent?.tournamentEvent?.slug) return null;
    
    return [
      '/tournament',
      game.tournamentDraw.tournamentSubEvent.tournamentEvent.slug,
      'sub-events',
      game.tournamentDraw.tournamentSubEvent.id,
      'draws',
      game.tournamentDraw.id
    ];
  }
}