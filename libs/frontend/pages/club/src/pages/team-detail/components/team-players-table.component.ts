import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SortMeta } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { PlayerStats } from '../page-team-detail.service';

@Component({
  selector: 'app-team-players-table',
  imports: [DecimalPipe, RouterModule, TableModule, TranslateModule, Tag, TooltipModule, ButtonModule],
  templateUrl: './team-players-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPlayersTableComponent {
  rawPlayers = input.required<any[]>({ alias: 'players' });
  playerStats = input<Map<string, PlayerStats>>(new Map());
  onAddPlayerToTeam = input<((playerId: string) => Promise<void>) | null>(null);
  onRemovePlayerFromTeam = input<((membershipId: string) => Promise<void>) | null>(null);

  defaultSort: SortMeta[] = [
    { field: 'membershipType', order: -1 },
    { field: 'player.lastName', order: 1 },
  ];

  players = computed(() => {
    const statsMap = this.playerStats();
    return this.rawPlayers().map((membership) => {
      const stats = statsMap.get(membership.player?.id) ?? { played: 0, won: 0, lost: 0, encountersPlayed: 0, totalEncounters: 0 };
      const winPct = stats.played > 0 ? (stats.won / stats.played) * 100 : null;
      const encounterPct = stats.totalEncounters > 0 ? (stats.encountersPlayed / stats.totalEncounters) * 100 : null;
      return {
        ...membership,
        isBase: membership.isBase ?? false,
        stats: { ...stats, winPct, encounterPct },
      };
    });
  });
}
