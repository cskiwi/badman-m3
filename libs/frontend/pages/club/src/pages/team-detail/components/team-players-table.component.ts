import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PlayerStats } from '../page-team-detail.service';

@Component({
  selector: 'app-team-players-table',
  imports: [DecimalPipe, RouterModule],
  templateUrl: './team-players-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPlayersTableComponent {
  players = input.required<any[]>();
  playerStats = input<Map<string, PlayerStats>>(new Map());

  getStats(playerId: string): PlayerStats {
    return this.playerStats().get(playerId) ?? { played: 0, won: 0, lost: 0 };
  }

  getWinPercentage(stats: PlayerStats): number | null {
    if (stats.played === 0) return null;
    return (stats.won / stats.played) * 100;
  }
}
