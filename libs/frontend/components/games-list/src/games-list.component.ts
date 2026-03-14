import { Component, computed, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { DataTableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

// Models
import { GamePlayerMembership } from '@app/models';

export interface GamesListOptions {
  showTournamentInfo?: boolean;
  showPagination?: boolean;
  showFilters?: boolean;
  showExport?: boolean;
  pageSize?: number;
  enableDrillDown?: boolean;
  showStatistics?: boolean;
}

@Component({
  selector: 'app-games-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    CalendarModule,
    CardModule,
    DataTableModule,
    SelectModule,
    InputTextModule,
    TagModule,
    SkeletonModule,
    ProgressBarModule,
    TooltipModule,
    ConfirmDialogModule,
  ],
  templateUrl: './games-list.component.html'
  styleUrls: []
})
export class GamesListComponent {
  // Inputs
  games = input.required<GamePlayerMembership[]>();
  playerId = input<string>();
  clubId = input<string>();
  options = input<GamesListOptions>({
    showTournamentInfo: true,
    showPagination: true,
    showFilters: true,
    showExport: false,
    pageSize: 10,
    enableDrillDown: true,
    showStatistics: true
  });

  // Form and signals
  filterForm = new FormGroup({
    tournament: new FormControl<string | null>(null),
    dateFrom: new FormControl<Date | null>(null),
    dateTo: new FormControl<Date | null>(null),
    result: new FormControl<string | null>(null),
    gameType: new FormControl<string | null>(null),
  });

  expandedRows: { [key: string]: boolean } = {};
  loading = signal(false);

  // Filter options
  resultOptions = [
    { label: 'WIN', value: 'win' },
    { label: 'LOSS', value: 'loss' }
  ];

  gameTypeOptions = [
    { label: 'SINGLE', value: 'S' },
    { label: 'DOUBLE', value: 'D' },
    { label: 'MIX', value: 'MX' }
  ];

  // Computed properties
  tournamentOptions = computed(() => {
    const games = this.games();
    const tournaments = new Map();
    
    games.forEach(game => {
      const tournament = game.subEventEntry?.entry?.event?.tournament;
      if (tournament) {
        tournaments.set(tournament.id, {
          id: tournament.id,
          name: tournament.name
        });
      }
    });
    
    return Array.from(tournaments.values());
  });

  filteredGames = computed(() => {
    const games = this.games();
    const filters = this.filterForm.getRawValue();
    
    return games.filter(game => {
      // Tournament filter
      if (filters.tournament) {
        const tournamentId = game.subEventEntry?.entry?.event?.tournament?.id;
        if (tournamentId !== filters.tournament) return false;
      }
      
      // Date filters
      if (filters.dateFrom && new Date(game.playedOn) < filters.dateFrom) return false;
      if (filters.dateTo && new Date(game.playedOn) > filters.dateTo) return false;
      
      // Result filter
      if (filters.result) {
        const isWin = this.isWin(game);
        if ((filters.result === 'win' && !isWin) || (filters.result === 'loss' && isWin)) {
          return false;
        }
      }
      
      // Game type filter
      if (filters.gameType) {
        const gameType = game.subEventEntry?.entry?.subEventType;
        if (gameType !== filters.gameType) return false;
      }
      
      return true;
    });
  });

  paginatedGames = computed(() => {
    const filtered = this.filteredGames();
    const pageSize = this.options().pageSize || 10;
    
    if (!this.options().showPagination) {
      return filtered;
    }
    
    return filtered.slice(0, pageSize);
  });

  statistics = computed(() => {
    const games = this.filteredGames();
    const totalGames = games.length;
    const wins = games.filter(game => this.isWin(game)).length;
    const losses = totalGames - wins;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    
    return {
      totalGames,
      wins,
      losses,
      winRate
    };
  });

  // Helper methods
  isWin(game: GamePlayerMembership): boolean {
    // Implementation would depend on your game structure
    return game.team === game.winner;
  }

  getOpponentName(game: GamePlayerMembership): string {
    // Implementation would depend on your game structure
    return 'Opponent Name'; // Placeholder
  }

  getOpponentInitials(game: GamePlayerMembership): string {
    const name = this.getOpponentName(game);
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  getScore(game: GamePlayerMembership): string {
    if (!game.sets || game.sets.length === 0) return 'N/A';
    
    return game.sets.map(set => `${set.team1Score}-${set.team2Score}`).join(' ');
  }

  getGameTypeLabel(game: GamePlayerMembership): string {
    const type = game.subEventEntry?.entry?.subEventType;
    switch (type) {
      case 'S': return 'Single';
      case 'D': return 'Double';
      case 'MX': return 'Mix';
      default: return 'Unknown';
    }
  }

  getGameTypeSeverity(game: GamePlayerMembership): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | null {
    const type = game.subEventEntry?.entry?.subEventType;
    switch (type) {
      case 'S': return 'info';
      case 'D': return 'success';
      case 'MX': return 'warning';
      default: return 'secondary';
    }
  }

  getGameDuration(game: GamePlayerMembership): string {
    // Implementation would calculate duration from start/end times
    return '45 min'; // Placeholder
  }

  getColumnCount(): number {
    let count = 6; // Base columns
    if (this.options().enableDrillDown) count++;
    if (this.options().showTournamentInfo) count++;
    return count;
  }

  // Action methods
  clearFilters(): void {
    this.filterForm.reset();
  }

  exportGames(): void {
    const games = this.filteredGames();
    // Implementation for export functionality
    console.log('Exporting games:', games);
  }

  toggleRow(game: GamePlayerMembership): void {
    if (this.expandedRows[game.id!]) {
      delete this.expandedRows[game.id!];
    } else {
      this.expandedRows[game.id!] = true;
    }
  }

  viewGameDetails(game: GamePlayerMembership): void {
    // Implementation for viewing game details
    console.log('Viewing game details:', game);
  }

  navigateToTournament(game: GamePlayerMembership): void {
    const tournamentId = game.subEventEntry?.entry?.event?.tournament?.id;
    if (tournamentId) {
      // Implementation for navigation
      console.log('Navigate to tournament:', tournamentId);
    }
  }
}