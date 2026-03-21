import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SortMeta } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { PlayerStats } from '../page-team-detail.service';

@Component({
  selector: 'app-team-players-table',
  imports: [DecimalPipe, RouterModule, TableModule],
  templateUrl: './team-players-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPlayersTableComponent {
  rawPlayers = input.required<any[]>({ alias: 'players' });
  playerStats = input<Map<string, PlayerStats>>(new Map());

  defaultSort: SortMeta[] = [
    { field: 'membershipType', order: -1 },
    { field: 'player.lastName', order: 1 },
  ];

  players = computed(() => {
    const statsMap = this.playerStats();
    return this.rawPlayers().map((membership) => {
      const stats = statsMap.get(membership.player?.id) ?? { played: 0, won: 0, lost: 0 };
      const winPct = stats.played > 0 ? (stats.won / stats.played) * 100 : null;
      return {
        ...membership,
        stats: { ...stats, winPct },
      };
    });
  });
}
