import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal, untracked } from '@angular/core';
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

  showUpgrade = signal(true);
  showDowngrade = signal(false);

  start = computed(() => this.filterSignal()?.start as Dayjs | null);
  next = computed(() => this.filterSignal()?.next as Dayjs | null);

  currGames = computed(() => {
    const startPeriod = this.start();
    const playerData = this.player();
    const sys = this.system();
    const allGames = this.games();

    if (!startPeriod || !playerData || !sys || allGames.length <= 0) {
      return [];
    }

    let games: GameBreakdown[] = [];

    untracked(() => {
      games = allGames.filter((x) => dayjs(x.playedAt).isSameOrAfter(startPeriod)).map((x) => x as unknown as GameBreakdown);

      this._addBreakdownInfo(games);
      this._determineUsedForRanking(games);
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

  filteredGames = computed(() => {
    const includedIgnored = this.filter.get('includedIgnored')?.value;
    const includedUpgrade = this.filter.get('includedUpgrade')?.value;
    const includedDowngrade = this.filter.get('includedDowngrade')?.value;
    const includeOutOfScopeDowngrade = this.filter.get('includeOutOfScopeDowngrade')?.value;
    const includeOutOfScopeUpgrade = this.filter.get('includeOutOfScopeUpgrade')?.value;
    const includeOutOfScopeWonGames = this.filter.get('includeOutOfScopeWonGames')?.value;

    return this.currGames().filter((x) => {
      if (includeOutOfScopeDowngrade && x.type === GameBreakdownType.LOST_DOWNGRADE && !x.usedForUpgrade) {
        return true;
      }

      if (includeOutOfScopeUpgrade && x.type === GameBreakdownType.LOST_UPGRADE && !x.usedForDowngrade) {
        return true;
      }

      if (includedIgnored && x.type === GameBreakdownType.LOST_IGNORED) {
        return true;
      }

      if (includedUpgrade && this.showUpgrade() && x.usedForUpgrade) {
        return true;
      }

      if (includedDowngrade && this.showDowngrade() && x.usedForDowngrade) {
        return true;
      }

      if (includeOutOfScopeWonGames && x.type === GameBreakdownType.WON) {
        return true;
      }

      return false;
    });
  });

  lostGamesUpgrade = computed(() => this.currGames().filter((x) => x.usedForUpgrade).length);
  lostGamesDowngrade = computed(() => this.currGames().filter((x) => x.usedForDowngrade).length);
  wonGames = computed(() => this.currGames().filter((x) => x.type === GameBreakdownType.WON).length);
  lostGamesIgnored = computed(() => this.currGames().filter((x) => x.type === GameBreakdownType.LOST_IGNORED).length);
  outOfScopeGamesUpgrade = computed(() => this.currGames().filter((x) => x.type === GameBreakdownType.LOST_UPGRADE && !x.usedForUpgrade).length);
  outOfScopeGamesDowngrade = computed(
    () => this.currGames().filter((x) => x.type === GameBreakdownType.LOST_DOWNGRADE && !x.usedForDowngrade).length,
  );

  private _addBreakdownInfo(games: GameBreakdown[]) {
    const playerData = this.player();
    const sys = this.system();
    const nextPeriod = this.next();

    for (const game of games) {
      const myMembership = game.gamePlayerMemberships?.find((gpm) => gpm.gamePlayer?.id === playerData.id || gpm.player === 1 || gpm.player === 2);
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

      // defaults
      game.usedForDowngrade = false;
      game.usedForUpgrade = false;
      game.canUpgrade = false;
      game.canDowngrade = false;
    }
  }

  private _determineUsedForRanking(games: GameBreakdown[]) {
    const sys = this.system();
    let validGamesUpgrade = 0;
    let validGamesDowngrade = 0;

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

      let validUpgrade = false;
      let validDowngrade = false;

      if (game.type === GameBreakdownType.WON) {
        validUpgrade = true;
        validDowngrade = true;
      } else {
        if (game.type === GameBreakdownType.LOST_UPGRADE) {
          validUpgrade = true;
        }

        if (game.type === GameBreakdownType.LOST_DOWNGRADE) {
          validUpgrade = true;
          validDowngrade = true;
        }
      }

      if (validUpgrade && validGamesUpgrade < (sys?.latestXGamesToUse ?? Infinity)) {
        validGamesUpgrade++;
        game.usedForUpgrade = true;
      }
      if (validDowngrade && validGamesDowngrade < (sys?.latestXGamesToUse ?? Infinity)) {
        validGamesDowngrade++;
        game.usedForDowngrade = true;
      }

      // if both x games are used, the rest of the games are not used
      if (validGamesUpgrade >= (sys?.latestXGamesToUse ?? Infinity) && validGamesDowngrade >= (sys?.latestXGamesToUse ?? Infinity)) {
        break;
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
    for (const game of games.filter((x) => x.usedForUpgrade)) {
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
    for (const game of games.filter((x) => x.usedForDowngrade)) {
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
}
