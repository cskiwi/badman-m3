import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RankingLastPlace, RankingSystem } from '@app/models';
import { GameBreakdownType, GetGameResultType } from '@app/utils/comp';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { startWith } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { Popover, PopoverModule } from 'primeng/popover';
import { GameBreakdown } from '../../models';
import { RankingBreakdownService, RankingType } from '../../page-ranking-breakdown.service';
import { DayjsFormatPipe } from '@app/frontend-utils/dayjs/fmt';

dayjs.extend(isSameOrAfter);

@Component({
  selector: 'app-list-games',
  templateUrl: './list-games.component.html',
  styleUrl: './list-games.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    ToggleButtonModule,
    CheckboxModule,
    PopoverModule,
    DayjsFormatPipe,
  ],
})
export class ListGamesComponent {
  private readonly translateService = inject(TranslateService);
  readonly breakdownService = inject(RankingBreakdownService);

  system = input.required<RankingSystem>();
  player = input.required<{ id: string }>();
  rankingPlace = input<RankingLastPlace | null>(null);
  type = input.required<RankingType>();

  games = this.breakdownService.games;
  loading = this.breakdownService.loading;
  filter = this.breakdownService.filter;
  private filterSignal = toSignal(this.filter.valueChanges.pipe(startWith(this.filter.value)));

  readonly gameInfoPopover = viewChild<Popover>('gameInfoPopover');
  hoveredGame = signal<GameBreakdown | null>(null);
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  showUpgrade = signal(true);
  showDowngrade = signal(false);

  enableRemoveGames = signal(false);
  enableToggleLatestX = signal(false);

  sortField = signal<string | null>(null);
  sortOrder = signal<1 | -1>(1);

  // Manual overrides
  excludedGameIds = signal<Set<string>>(new Set());
  latestXOverrides = signal<Map<string, boolean>>(new Map()); // force in/out of latest X window

  start = computed(() => this.filterSignal()?.start as Dayjs | null);
  next = computed(() => this.filterSignal()?.next as Dayjs | null);

  currGames = computed(() => {
    const startPeriod = this.start();
    const playerData = this.player();
    const sys = this.system();
    const allGames = this.games();
    const excluded = this.excludedGameIds();
    const latestXOvr = this.latestXOverrides();

    if (!startPeriod || !playerData || !sys || allGames.length <= 0) {
      return [];
    }

    let games: GameBreakdown[] = [];

    untracked(() => {
      games = allGames
        .filter((x) => dayjs(x.playedAt).isSameOrAfter(startPeriod) && !excluded.has(x.id))
        .map((x) => x as unknown as GameBreakdown);

      this._addBreakdownInfo(games);
      this._determineUsedForRanking(games, latestXOvr);
      this._calculateAverageUpgrade(games);
    });

    return games.sort((a, b) => {
      if (a.devideDowngrade && b.devideDowngrade) {
        return a.devideDowngrade - b.devideDowngrade;
      }

      if (a.devideUpgrade && b.devideUpgrade) {
        return a.devideUpgrade - b.devideUpgrade;
      }

      if (a.usedForUpgrade && !b.usedForUpgrade) {
        return -1;
      }

      if (!a.usedForUpgrade && b.usedForUpgrade) {
        return 1;
      }

      if (a.usedForDowngrade && !b.usedForDowngrade) {
        return -1;
      }

      if (!a.usedForDowngrade && b.usedForDowngrade) {
        return 1;
      }

      return 0;
    });
  });

  excludedCount = computed(() => this.excludedGameIds().size);
  hasOverrides = computed(() => this.excludedGameIds().size > 0 || this.latestXOverrides().size > 0);

  totalColumns = computed(() => {
    let cols = 5; // status icons, date, team, opponent, points
    if (this.enableRemoveGames()) cols++;
    if (this.enableToggleLatestX()) cols++; // single shared "in latest X" column
    if (this.showUpgrade()) cols += 3; // # badge, used checkbox, average
    if (this.showDowngrade()) cols += 3; // # badge, used checkbox, average
    return cols;
  });

  filteredGames = computed(() => {
    const includedIgnored = this.filter.get('includedIgnored')?.value;
    const includedUpgrade = this.filter.get('includedUpgrade')?.value;
    const includedDowngrade = this.filter.get('includedDowngrade')?.value;
    const includeOutOfScopeDowngrade = this.filter.get('includeOutOfScopeDowngrade')?.value;
    const includeOutOfScopeUpgrade = this.filter.get('includeOutOfScopeUpgrade')?.value;
    const includeOutOfScopeWonGames = this.filter.get('includeOutOfScopeWonGames')?.value;
    const includeOutOfScopeLatestX = this.filter.get('includeOutOfScopeLatestX')?.value;
    const latestXOvr = this.latestXOverrides();

    return this.currGames().filter((x) => {
      // Games with manual overrides should always stay visible
      if (latestXOvr.has(x.id)) {
        return true;
      }

      if (includedIgnored && x.type === GameBreakdownType.LOST_IGNORED) {
        return true;
      }

      // Games in the latest X window
      if (x.inLatestX) {
        if (includedUpgrade && this.showUpgrade() && x.usedForUpgrade) {
          return true;
        }

        if (includedDowngrade && this.showDowngrade() && x.usedForDowngrade) {
          return true;
        }

        if (includeOutOfScopeWonGames && x.type === GameBreakdownType.WON) {
          return true;
        }

        if (includeOutOfScopeDowngrade && x.type === GameBreakdownType.LOST_DOWNGRADE && !x.usedForUpgrade) {
          return true;
        }

        if (includeOutOfScopeUpgrade && x.type === GameBreakdownType.LOST_UPGRADE && !x.usedForDowngrade) {
          return true;
        }
      }

      // Games outside the latest X window
      if (!x.inLatestX && includeOutOfScopeLatestX && x.type !== GameBreakdownType.LOST_IGNORED) {
        return true;
      }

      return false;
    });
  });

  displayGames = computed(() => {
    const games = [...this.filteredGames()];
    const field = this.sortField();
    const order = this.sortOrder();

    if (!field) {
      return games;
    }

    return games.sort((a, b) => {
      let valueA: unknown = a[field as keyof GameBreakdown];
      let valueB: unknown = b[field as keyof GameBreakdown];

      if (field === 'playedAt') {
        valueA = valueA ? new Date(valueA as string).getTime() : 0;
        valueB = valueB ? new Date(valueB as string).getTime() : 0;
      }

      let result = 0;
      if (valueA == null && valueB != null) {
        result = -1;
      } else if (valueA != null && valueB == null) {
        result = 1;
      } else if (typeof valueA === 'number' && typeof valueB === 'number') {
        result = valueA - valueB;
      }

      return order * result;
    });
  });

  lostGamesUpgrade = computed(() => this.currGames().filter((x) => x.usedForUpgrade && x.inLatestX).length);
  lostGamesDowngrade = computed(() => this.currGames().filter((x) => x.usedForDowngrade && x.inLatestX).length);
  wonGames = computed(() => this.currGames().filter((x) => x.type === GameBreakdownType.WON).length);
  lostGamesIgnored = computed(() => this.currGames().filter((x) => x.type === GameBreakdownType.LOST_IGNORED).length);
  outOfScopeGamesUpgrade = computed(() => this.currGames().filter((x) => x.type === GameBreakdownType.LOST_UPGRADE && !x.inLatestX).length);
  outOfScopeGamesDowngrade = computed(
    () => this.currGames().filter((x) => x.type === GameBreakdownType.LOST_DOWNGRADE && !x.inLatestX).length,
  );
  outOfScopeLatestXGames = computed(
    () => this.currGames().filter((x) => !x.inLatestX && x.type !== GameBreakdownType.LOST_IGNORED).length,
  );

  private _addBreakdownInfo(games: GameBreakdown[]) {
    const playerData = this.player();
    const sys = this.system();
    const nextPeriod = this.next();

    for (const game of games) {
      const myMembership = game.gamePlayerMemberships?.find((gpm) => gpm.gamePlayer?.id === playerData.id);
      const myTeam = myMembership?.team;


      if (!game.gameType) {
        console.warn(`Game ${game.id} has no gameType`);
        continue;
      }

      const rankingPoint = game.rankingPoints?.find((x) => x.playerId === playerData.id && x.systemId === sys.id);

      const type = GetGameResultType(game.winner === myTeam, game.gameType, {
        differenceInLevel: rankingPoint?.differenceInLevel ?? 0,
        system: sys,
      });

      game.points = rankingPoint?.points ?? 0;
      game.type = type;
      game.opponent = game.gamePlayerMemberships?.filter((x) => x.team !== myTeam) ?? [];
      game.team = game.gamePlayerMemberships?.filter((x) => x.team === myTeam) ?? [];
      game.dropsNextPeriod = nextPeriod ? dayjs(game.playedAt).isBefore(nextPeriod) : false;

      // Set usedForUpgrade/usedForDowngrade based purely on game type (level difference)
      if (type === GameBreakdownType.WON) {
        game.usedForUpgrade = true;
        game.usedForDowngrade = true;
      } else if (type === GameBreakdownType.LOST_UPGRADE) {
        game.usedForUpgrade = true;
        game.usedForDowngrade = false;
      } else if (type === GameBreakdownType.LOST_DOWNGRADE) {
        game.usedForUpgrade = true;
        game.usedForDowngrade = true;
      } else {
        game.usedForUpgrade = false;
        game.usedForDowngrade = false;
      }

      // defaults for calculated fields
      game.inLatestX = false;
      game.canUpgrade = false;
      game.canDowngrade = false;
      game.outOfScopeLatestXUpgrade = false;
      game.outOfScopeLatestXDowngrade = false;
      game.countUpgrade = undefined;
      game.countDowngrade = undefined;
      game.devideUpgrade = undefined;
      game.devideDowngrade = undefined;
      game.devideUpgradeCorrected = undefined;
      game.devideDowngradeCorrected = undefined;
      game.totalPointsUpgrade = undefined;
      game.totalPointsDowngrade = undefined;
      game.avgUpgrade = undefined;
      game.avgDowngrade = undefined;
      game.highestAvgUpgrade = undefined;
      game.highestAvgDowngrade = undefined;
    }
  }

  toggleLatestX(game: GameBreakdown) {
    this.latestXOverrides.update((map) => {
      const next = new Map(map);
      next.set(game.id, !game.inLatestX);
      return next;
    });
  }

  removeGame(game: GameBreakdown) {
    this.excludedGameIds.update((set) => {
      const next = new Set(set);
      next.add(game.id);
      return next;
    });
  }

  restoreAllGames() {
    this.excludedGameIds.set(new Set());
    this.latestXOverrides.set(new Map());
  }

  private _determineUsedForRanking(games: GameBreakdown[], latestXOverrides: Map<string, boolean>) {
    const sys = this.system();
    let validGames = 0;

    const limit = sys?.latestXGamesToUse ?? Infinity;

    // sort games by playedAt newest first
    for (const game of games.slice().sort((a, b) => {
      if (!a.playedAt || !b.playedAt) {
        return 0;
      }
      return new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime();
    })) {
      if (game.type === GameBreakdownType.LOST_IGNORED) {
        continue;
      }

      const latestXOverride = latestXOverrides.get(game.id);

      // Handle latest X overrides
      if (latestXOverride === false) {
        game.inLatestX = false;
        continue;
      }

      if (latestXOverride === true) {
        game.inLatestX = true;
        validGames++;
        continue;
      }

      // Normal behavior: respect latest X limit
      if (validGames < limit) {
        validGames++;
        game.inLatestX = true;
      } else {
        game.inLatestX = false;
        if (game.usedForUpgrade) {
          game.outOfScopeLatestXUpgrade = true;
        }
        if (game.usedForDowngrade) {
          game.outOfScopeLatestXDowngrade = true;
        }
      }
    }

    return games;
  }

  private _calculateAverageUpgrade(games: GameBreakdown[]) {
    const sys = this.system();
    const rankingPlaceData = this.rankingPlace();
    const gameType = this.type();

    // sort games: first all 0 points, then highest points first
    games = games.sort((a, b) => {
      if (a.points === 0 && b.points !== 0) {
        return -1;
      }

      if (a.points !== 0 && b.points === 0) {
        return 1;
      }

      if (a.points === b.points) {
        return 0;
      }
      return (a.points ?? 0) > (b.points ?? 0) ? -1 : 1;
    });

    // Upgrade
    let totalPointsUpgrade = 0;
    let gamesProcessedUpgrade = 0;
    let workingAvgUpgrade = 0;
    for (const game of games.filter((x) => x.usedForUpgrade && x.inLatestX)) {
      gamesProcessedUpgrade++;
      game.devideUpgrade = gamesProcessedUpgrade;
      game.countUpgrade = gamesProcessedUpgrade;

      let divider = gamesProcessedUpgrade;
      if (divider < (sys.minNumberOfGamesUsedForUpgrade ?? 1)) {
        divider = sys.minNumberOfGamesUsedForUpgrade ?? 1;
      }

      totalPointsUpgrade += game.points ?? 0;
      const avg = totalPointsUpgrade / divider;
      if (avg > workingAvgUpgrade) {
        workingAvgUpgrade = avg;
      }

      game.totalPointsUpgrade = totalPointsUpgrade;
      game.avgUpgrade = workingAvgUpgrade;
      game.devideUpgradeCorrected = divider;
    }

    // Downgrade
    let totalPointsDowngrade = 0;
    let gamesProcessedDowngrade = 0;
    let workingAvgDowngrade = 0;
    for (const game of games.filter((x) => x.usedForDowngrade && x.inLatestX)) {
      gamesProcessedDowngrade++;
      game.devideDowngrade = gamesProcessedDowngrade;
      game.countDowngrade = gamesProcessedDowngrade;

      let divider = gamesProcessedDowngrade;
      if (divider < (sys.minNumberOfGamesUsedForDowngrade ?? 1)) {
        divider = sys.minNumberOfGamesUsedForDowngrade ?? 1;
      }

      totalPointsDowngrade += game.points ?? 0;
      const avg = totalPointsDowngrade / divider;
      if (avg > workingAvgDowngrade) {
        workingAvgDowngrade = avg;
      }

      game.totalPointsDowngrade = totalPointsDowngrade;
      game.avgDowngrade = workingAvgDowngrade;
      game.devideDowngradeCorrected = divider;
    }

    const level = rankingPlaceData?.[gameType] ?? 12;

    // set highest avg for upgrade and downgrade
    for (const game of games) {
      if (game.avgUpgrade === workingAvgUpgrade) {
        game.highestAvgUpgrade = true;
        if (workingAvgUpgrade >= (sys.pointsToGoUp?.[(sys.amountOfLevels ?? 12) - level] ?? 0)) {
          game.canUpgrade = true;
        }
        break;
      }
    }
    for (const game of games) {
      if (game.avgDowngrade === workingAvgDowngrade) {
        game.highestAvgDowngrade = true;
        if (workingAvgDowngrade <= (sys.pointsToGoDown?.[(sys.amountOfLevels ?? 12) - (level + 1)] ?? 0)) {
          game.canDowngrade = true;
        }
        break;
      }
    }

    return games;
  }

  getTooltip(game: GameBreakdown, isForUpgrade: boolean, usedPoints: boolean): string {
    let divider = '';
    let totalPoints = 0;
    const rankingPlaceData = this.rankingPlace();
    const sys = this.system();
    const gameType = this.type();

    if (isForUpgrade) {
      totalPoints = game.totalPointsUpgrade ?? 0;
      divider = `${game.devideUpgradeCorrected}`;
      if ((game.devideUpgrade ?? 0) < (game.devideUpgradeCorrected ?? 0)) {
        divider += `\n\n${this.translateService.instant('all.ranking.breakdown.corrected', {
          original: game.devideUpgrade,
          corrected: game.devideUpgradeCorrected,
        })}`;
      }
    } else {
      totalPoints = game.totalPointsDowngrade ?? 0;
      divider = `${game.devideDowngrade}`;
    }

    let tooltip = `${totalPoints} / ${divider}`;

    if (usedPoints) {
      if (isForUpgrade) {
        const level = rankingPlaceData?.[gameType] ?? 12;

        tooltip += `\n\n${this.translateService.instant(
          game.canUpgrade ? 'all.ranking.breakdown.can-upgrade' : 'all.ranking.breakdown.can-not-upgrade',
          {
            level,
            newLevel: level - 1,
            points: sys.pointsToGoUp?.[(sys.amountOfLevels ?? 12) - level],
          },
        )}`;
      } else {
        const level = rankingPlaceData?.[gameType] ?? 12;

        tooltip += `\n\n${this.translateService.instant(
          game.canDowngrade ? 'all.ranking.breakdown.can-downgrade' : 'all.ranking.breakdown.can-not-downgrade',
          {
            level,
            newLevel: level + 1,
            points: sys.pointsToGoDown?.[(sys.amountOfLevels ?? 12) - (level + 1)],
          },
        )}`;
      }
    }

    return tooltip;
  }

  showGameInfo(event: Event, game: GameBreakdown) {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    const popover = this.gameInfoPopover();
    if (popover) {
      popover.hide();
      this.hoveredGame.set(game);
      // Small delay so the popover can reposition to the new target
      setTimeout(() => popover.show(event), 0);
    }
  }

  hideGameInfo() {
    this.hideTimeout = setTimeout(() => {
      this.gameInfoPopover()?.hide();
      this.hoveredGame.set(null);
    }, 150);
  }

  isSetPlayed(team1Score: number | undefined, team2Score: number | undefined): boolean {
    return team1Score != null && team2Score != null && (team1Score > 0 || team2Score > 0);
  }

  hasScores(game: GameBreakdown): boolean {
    return this.isSetPlayed(game.set1Team1, game.set1Team2);
  }

  getPlayerTeam(game: GameBreakdown): number | undefined {
    return game.team?.[0]?.team;
  }

  getPlayerSetScore(game: GameBreakdown, set: number): number {
    const team = this.getPlayerTeam(game);
    const key = `set${set}Team${team}` as keyof GameBreakdown;
    return (game[key] as number) ?? 0;
  }

  getOpponentSetScore(game: GameBreakdown, set: number): number {
    const team = this.getPlayerTeam(game) === 1 ? 2 : 1;
    const key = `set${set}Team${team}` as keyof GameBreakdown;
    return (game[key] as number) ?? 0;
  }

  getTeamDisplay(game: GameBreakdown): string {
    const gameType = this.type();
    return game.team
      ?.map((p) => {
        const level = p?.[gameType] ?? '?';
        return `${p?.gamePlayer?.fullName ?? 'Unknown'} (${level})`;
      })
      .join(', ');
  }

  getOpponentDisplay(game: GameBreakdown): string {
    const gameType = this.type();
    return game.opponent
      ?.map((p) => {
        const level = p?.[gameType] ?? '?';
        return `${p?.gamePlayer?.fullName ?? 'Unknown'} (${level})`;
      })
      .join(', ');
  }

  toggleSort(field: string) {
    if (this.sortField() !== field) {
      this.sortField.set(field);
      this.sortOrder.set(1);
    } else if (this.sortOrder() === 1) {
      this.sortOrder.set(-1);
    } else {
      this.sortField.set(null);
      this.sortOrder.set(1);
    }
  }

  getSortIcon(field: string): string {
    if (this.sortField() !== field) {
      return 'pi-sort-alt';
    }
    return this.sortOrder() === 1 ? 'pi-sort-amount-up-alt' : 'pi-sort-amount-down';
  }
}
