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
  template: `
    <div class="games-list-container">
      <!-- Statistics Summary -->
      @if (options().showStatistics) {
        <div class="grid gap-4 mb-6">
          <div class="col-12 md:col-3">
            <p-card class="bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700">
              <div class="flex items-center">
                <div class="flex-shrink-0 w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-lg flex items-center justify-center mr-3">
                  <i class="pi pi-list text-primary-600 dark:text-primary-400"></i>
                </div>
                <div>
                  <div class="text-2xl font-bold text-primary-900 dark:text-primary-100">{{ statistics().totalGames }}</div>
                  <div class="text-sm text-primary-600 dark:text-primary-400">{{ 'GAMES.TOTAL_GAMES' | translate }}</div>
                </div>
              </div>
            </p-card>
          </div>
          <div class="col-12 md:col-3">
            <p-card class="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700">
              <div class="flex items-center">
                <div class="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center mr-3">
                  <i class="pi pi-check text-green-600 dark:text-green-400"></i>
                </div>
                <div>
                  <div class="text-2xl font-bold text-green-900 dark:text-green-100">{{ statistics().wins }}</div>
                  <div class="text-sm text-green-600 dark:text-green-400">{{ 'GAMES.WINS' | translate }}</div>
                </div>
              </div>
            </p-card>
          </div>
          <div class="col-12 md:col-3">
            <p-card class="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700">
              <div class="flex items-center">
                <div class="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-800 rounded-lg flex items-center justify-center mr-3">
                  <i class="pi pi-times text-red-600 dark:text-red-400"></i>
                </div>
                <div>
                  <div class="text-2xl font-bold text-red-900 dark:text-red-100">{{ statistics().losses }}</div>
                  <div class="text-sm text-red-600 dark:text-red-400">{{ 'GAMES.LOSSES' | translate }}</div>
                </div>
              </div>
            </p-card>
          </div>
          <div class="col-12 md:col-3">
            <p-card class="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700">
              <div class="flex items-center">
                <div class="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center mr-3">
                  <i class="pi pi-percentage text-blue-600 dark:text-blue-400"></i>
                </div>
                <div>
                  <div class="text-2xl font-bold text-blue-900 dark:text-blue-100">{{ statistics().winRate }}%</div>
                  <div class="text-sm text-blue-600 dark:text-blue-400">{{ 'GAMES.WIN_RATE' | translate }}</div>
                </div>
              </div>
            </p-card>
          </div>
        </div>
      }

      <!-- Filters Panel -->
      @if (options().showFilters) {
        <p-card class="mb-6" styleClass="border border-surface-200 dark:border-surface-700">
          <ng-template pTemplate="header">
            <div class="flex items-center gap-2">
              <i class="pi pi-filter text-surface-600 dark:text-surface-400"></i>
              <span class="font-semibold text-surface-900 dark:text-surface-50">{{ 'GAMES.FILTERS' | translate }}</span>
            </div>
          </ng-template>
          
          <form [formGroup]="filterForm" class="grid gap-4">
            <!-- Tournament Filter -->
            <div class="col-12 md:col-4">
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                {{ 'GAMES.TOURNAMENT' | translate }}
              </label>
              <p-select 
                formControlName="tournament"
                [options]="tournamentOptions()"
                optionLabel="name"
                optionValue="id"
                [placeholder]="'GAMES.SELECT_TOURNAMENT' | translate"
                [showClear]="true"
                styleClass="w-full">
              </p-select>
            </div>

            <!-- Date Range Filter -->
            <div class="col-12 md:col-4">
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                {{ 'GAMES.DATE_FROM' | translate }}
              </label>
              <p-calendar 
                formControlName="dateFrom"
                [placeholder]="'GAMES.SELECT_DATE' | translate"
                [showIcon]="true"
                styleClass="w-full">
              </p-calendar>
            </div>

            <div class="col-12 md:col-4">
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                {{ 'GAMES.DATE_TO' | translate }}
              </label>
              <p-calendar 
                formControlName="dateTo"
                [placeholder]="'GAMES.SELECT_DATE' | translate"
                [showIcon]="true"
                styleClass="w-full">
              </p-calendar>
            </div>

            <!-- Result Filter -->
            <div class="col-12 md:col-4">
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                {{ 'GAMES.RESULT' | translate }}
              </label>
              <p-select 
                formControlName="result"
                [options]="resultOptions"
                optionLabel="label"
                optionValue="value"
                [placeholder]="'GAMES.ALL_RESULTS' | translate"
                [showClear]="true"
                styleClass="w-full">
              </p-select>
            </div>

            <!-- Game Type Filter -->
            <div class="col-12 md:col-4">
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                {{ 'GAMES.GAME_TYPE' | translate }}
              </label>
              <p-select 
                formControlName="gameType"
                [options]="gameTypeOptions"
                optionLabel="label"
                optionValue="value"
                [placeholder]="'GAMES.ALL_TYPES' | translate"
                [showClear]="true"
                styleClass="w-full">
              </p-select>
            </div>

            <!-- Action Buttons -->
            <div class="col-12 md:col-4 flex items-end gap-2">
              <p-button 
                (click)="clearFilters()"
                [label]="'COMMON.CLEAR_FILTERS' | translate"
                icon="pi pi-times"
                severity="secondary"
                size="small"
                [outlined]="true">
              </p-button>
              @if (options().showExport) {
                <p-button 
                  (click)="exportGames()"
                  [label]="'GAMES.EXPORT' | translate"
                  icon="pi pi-download"
                  severity="info"
                  size="small"
                  [outlined]="true">
                </p-button>
              }
            </div>
          </form>
        </p-card>
      }

      <!-- Games Table -->
      <p-card styleClass="border border-surface-200 dark:border-surface-700">
        <ng-template pTemplate="header">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="pi pi-list text-surface-600 dark:text-surface-400"></i>
              <span class="font-semibold text-surface-900 dark:text-surface-50">{{ 'GAMES.GAMES_LIST' | translate }}</span>
            </div>
            @if (filteredGames().length > 0) {
              <span class="text-sm text-surface-600 dark:text-surface-400">
                {{ 'GAMES.SHOWING_COUNT' | translate: { count: filteredGames().length } }}
              </span>
            }
          </div>
        </ng-template>

        @if (loading()) {
          <div class="space-y-3">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="flex gap-4 p-3 border border-surface-200 dark:border-surface-700 rounded">
                <p-skeleton shape="circle" size="3rem"></p-skeleton>
                <div class="flex-1">
                  <p-skeleton height="1rem" width="60%" styleClass="mb-2"></p-skeleton>
                  <p-skeleton height="0.75rem" width="40%"></p-skeleton>
                </div>
                <p-skeleton height="2rem" width="4rem"></p-skeleton>
              </div>
            }
          </div>
        } @else if (filteredGames().length === 0) {
          <div class="flex flex-col items-center justify-center py-16 text-center">
            <i class="pi pi-info-circle text-4xl text-surface-400 dark:text-surface-500 mb-4"></i>
            <h3 class="text-lg font-semibold text-surface-600 dark:text-surface-400 mb-2">
              {{ 'GAMES.NO_GAMES_FOUND' | translate }}
            </h3>
            <p class="text-surface-500 dark:text-surface-400">
              {{ 'GAMES.NO_GAMES_DESCRIPTION' | translate }}
            </p>
          </div>
        } @else {
          <p-dataTable 
            [value]="paginatedGames()"
            [paginator]="options().showPagination"
            [rows]="options().pageSize || 10"
            [totalRecords]="filteredGames().length"
            [rowsPerPageOptions]="[5, 10, 25, 50]"
            [showCurrentPageReport]="true"
            currentPageReportTemplate="{{ 'GAMES.PAGE_REPORT' | translate }}"
            styleClass="p-datatable-sm"
            [expandedRowKeys]="expandedRows"
            dataKey="id">

            <ng-template pTemplate="header">
              <tr>
                @if (options().enableDrillDown) {
                  <th style="width:3rem"></th>
                }
                <th [sortable]="true" field="playedOn">{{ 'GAMES.DATE' | translate }}</th>
                @if (options().showTournamentInfo) {
                  <th [sortable]="true" field="tournament.name">{{ 'GAMES.TOURNAMENT' | translate }}</th>
                }
                <th>{{ 'GAMES.OPPONENT' | translate }}</th>
                <th>{{ 'GAMES.RESULT' | translate }}</th>
                <th>{{ 'GAMES.SCORE' | translate }}</th>
                <th>{{ 'GAMES.GAME_TYPE' | translate }}</th>
                <th>{{ 'COMMON.ACTIONS' | translate }}</th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-game let-expanded="expanded">
              <tr>
                @if (options().enableDrillDown) {
                  <td>
                    <p-button 
                      type="button" 
                      [icon]="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                      (click)="toggleRow(game)"
                      severity="secondary"
                      [text]="true"
                      size="small">
                    </p-button>
                  </td>
                }
                <td>
                  <span class="text-sm">{{ game.playedOn | date: 'short' }}</span>
                </td>
                @if (options().showTournamentInfo) {
                  <td>
                    <span class="text-sm font-medium">{{ game.subEventEntry?.entry?.event?.tournament?.name || 'N/A' }}</span>
                  </td>
                }
                <td>
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center text-xs font-medium">
                      {{ getOpponentInitials(game) }}
                    </div>
                    <span class="text-sm">{{ getOpponentName(game) }}</span>
                  </div>
                </td>
                <td>
                  @if (isWin(game)) {
                    <p-tag severity="success" [value]="'GAMES.WIN' | translate" size="small"></p-tag>
                  } @else {
                    <p-tag severity="danger" [value]="'GAMES.LOSS' | translate" size="small"></p-tag>
                  }
                </td>
                <td>
                  <span class="text-sm font-mono">{{ getScore(game) }}</span>
                </td>
                <td>
                  <p-tag 
                    [severity]="getGameTypeSeverity(game)"
                    [value]="getGameTypeLabel(game)"
                    size="small">
                  </p-tag>
                </td>
                <td>
                  <div class="flex gap-1">
                    @if (options().enableDrillDown) {
                      <p-button 
                        (click)="viewGameDetails(game)"
                        icon="pi pi-eye"
                        severity="info"
                        [text]="true"
                        size="small"
                        pTooltip="{{ 'GAMES.VIEW_DETAILS' | translate }}">
                      </p-button>
                    }
                    <p-button 
                      (click)="navigateToTournament(game)"
                      icon="pi pi-external-link"
                      severity="secondary"
                      [text]="true"
                      size="small"
                      pTooltip="{{ 'GAMES.GO_TO_TOURNAMENT' | translate }}">
                    </p-button>
                  </div>
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="rowexpansion" let-game>
              <tr>
                <td [colSpan]="getColumnCount()">
                  <div class="p-4 bg-surface-50 dark:bg-surface-800">
                    <h4 class="font-semibold text-surface-900 dark:text-surface-50 mb-3">
                      {{ 'GAMES.GAME_DETAILS' | translate }}
                    </h4>
                    
                    <div class="grid gap-4">
                      <!-- Game Info -->
                      <div class="col-12 md:col-6">
                        <div class="space-y-2">
                          <div class="flex justify-between">
                            <span class="text-surface-600 dark:text-surface-400">{{ 'GAMES.LOCATION' | translate }}:</span>
                            <span class="text-surface-900 dark:text-surface-50">{{ game.location || 'N/A' }}</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-surface-600 dark:text-surface-400">{{ 'GAMES.COURT' | translate }}:</span>
                            <span class="text-surface-900 dark:text-surface-50">{{ game.court || 'N/A' }}</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-surface-600 dark:text-surface-400">{{ 'GAMES.DURATION' | translate }}:</span>
                            <span class="text-surface-900 dark:text-surface-50">{{ getGameDuration(game) }}</span>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Set Scores -->
                      <div class="col-12 md:col-6">
                        <h5 class="font-medium text-surface-900 dark:text-surface-50 mb-2">{{ 'GAMES.SET_SCORES' | translate }}</h5>
                        <div class="space-y-1">
                          @for (set of game.sets; track set.id) {
                            <div class="flex items-center justify-between p-2 bg-surface-100 dark:bg-surface-700 rounded">
                              <span class="text-sm">{{ 'GAMES.SET' | translate }} {{ set.setNumber }}</span>
                              <span class="text-sm font-mono">{{ set.team1Score }} - {{ set.team2Score }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
              <tr>
                <td [colSpan]="getColumnCount()" class="text-center py-8">
                  <div class="flex flex-col items-center">
                    <i class="pi pi-info-circle text-3xl text-surface-400 dark:text-surface-500 mb-2"></i>
                    <span class="text-surface-600 dark:text-surface-400">{{ 'GAMES.NO_GAMES_FOUND' | translate }}</span>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-dataTable>
        }
      </p-card>
    </div>
  `,
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