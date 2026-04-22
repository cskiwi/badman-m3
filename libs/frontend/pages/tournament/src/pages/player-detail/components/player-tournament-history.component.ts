import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AccordionModule } from 'primeng/accordion';
import { TooltipModule } from 'primeng/tooltip';
import { type PlayerTournamentHistory } from '../page-player-detail.service';

interface GameLike {
  winner?: number | null;
  set1Team1?: number | null;
  set1Team2?: number | null;
  set2Team1?: number | null;
  set2Team2?: number | null;
  set3Team1?: number | null;
  set3Team2?: number | null;
  gamePlayerMemberships?: Array<{ team?: number; gamePlayer: { id: string; fullName: string } }>;
  status?: string;
}

@Component({
  selector: 'app-player-tournament-history',
  imports: [DatePipe, RouterModule, TranslateModule, TableModule, TagModule, ButtonModule, CardModule, AccordionModule, TooltipModule],
  templateUrl: './player-tournament-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerTournamentHistoryComponent {
  tournamentHistory = input.required<PlayerTournamentHistory[]>();
  playerId = input.required<string>();

  getPartner(history: PlayerTournamentHistory): string | null {
    const entry = history.entry;
    const playerId = this.playerId();

    if (entry?.player1Id === playerId && entry.player2) {
      return entry.player2.fullName;
    } else if (entry?.player2Id === playerId && entry.player1) {
      return entry.player1.fullName;
    }

    return null;
  }

  getWonGames(history: PlayerTournamentHistory): number {
    return history.games?.filter((game) => this.isPlayerWinner(game)).length || 0;
  }

  getLostGames(history: PlayerTournamentHistory): number {
    return history.games?.filter((game) => game.status === 'NORMAL' && !this.isPlayerWinner(game)).length || 0;
  }

  getPlayerTeam(game: GameLike): number | null {
    const playerId = this.playerId();
    const membership = game.gamePlayerMemberships?.find((gpm) => gpm.gamePlayer.id === playerId);
    return membership?.team ?? null;
  }

  isPlayerWinner(game: GameLike): boolean {
    const playerTeam = this.getPlayerTeam(game);
    return playerTeam !== null && game.winner === playerTeam;
  }

  getOpponentNames(game: GameLike): string {
    const playerId = this.playerId();
    const opponents = game.gamePlayerMemberships
      ?.filter((gpm) => gpm.gamePlayer.id !== playerId)
      .map((gpm) => gpm.gamePlayer.fullName)
      .join(' & ');

    return opponents || 'Unknown';
  }

  hasScore(game: GameLike): boolean {
    return game.set1Team1 !== null && game.set1Team1 !== undefined && game.set1Team2 !== null && game.set1Team2 !== undefined;
  }

  getPlayerScore(game: GameLike, setNumber: 1 | 2 | 3): number {
    const playerTeam = this.getPlayerTeam(game);
    if (playerTeam === null) return 0;

    const scoreKey = `set${setNumber}Team${playerTeam}` as keyof GameLike;
    return (game[scoreKey] as number | undefined) || 0;
  }

  getOpponentScore(game: GameLike, setNumber: 1 | 2 | 3): number {
    const playerTeam = this.getPlayerTeam(game);
    if (playerTeam === null) return 0;

    const opponentTeam = playerTeam === 1 ? 2 : 1;
    const scoreKey = `set${setNumber}Team${opponentTeam}` as keyof GameLike;
    return (game[scoreKey] as number | undefined) || 0;
  }

  isSetWinner(game: GameLike, setNumber: 1 | 2 | 3): boolean {
    const playerScore = this.getPlayerScore(game, setNumber);
    const opponentScore = this.getOpponentScore(game, setNumber);
    return playerScore > opponentScore;
  }

  getTournamentLink(history: PlayerTournamentHistory): string[] {
    // Guard against missing tournament or slug to avoid 'possibly undefined' and 'string | undefined' errors.
    const tournament = history.tournament;
    if (!tournament || !tournament.slug) {
      // Fallback: link to tournament list if specific tournament slug is unavailable.
      return ['/tournament'];
    }

    return ['/tournament', tournament.slug, 'sub-events', String(history.subEvent?.id), 'draws', String(history.draw?.id)];
  }
}
