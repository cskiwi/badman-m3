import { ChangeDetectionStrategy, Component, computed, effect, inject, Signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RankingSystemService } from '@app/frontend-modules-graphql/ranking';
import { SeoService } from '@app/frontend-modules-seo/service';
import { TranslateModule } from '@ngx-translate/core';
import dayjs from 'dayjs';
import { injectParams } from 'ngxtension/inject-params';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ListGamesComponent, PeriodSelectionComponent } from './components';
import { RankingBreakdownService, RankingType } from './page-ranking-breakdown.service';
import { ShowLevelService } from '../detail/components/show-level.service';
import { RankingSystem } from '@app/models';
import { AuthService } from '@app/frontend-modules-auth/service';

@Component({
  selector: 'app-page-ranking-breakdown',
  templateUrl: './page-ranking-breakdown.component.html',
  styleUrl: './page-ranking-breakdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RankingBreakdownService],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    ProgressBarModule,
    ButtonModule,
    CardModule,
    SelectModule,
    SkeletonModule,
    ToggleButtonModule,
    ListGamesComponent,
    PeriodSelectionComponent,
  ],
})
export class PageRankingBreakdownComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seoService = inject(SeoService);
  private readonly systemService = inject(RankingSystemService);
  private readonly showLevelService = inject(ShowLevelService);
  readonly breakdownService = inject(RankingBreakdownService);

  // Route params
  readonly playerId = injectParams('playerId') as Signal<string>;
  readonly type = injectParams('type') as Signal<RankingType>;
  readonly periodEndRoute = injectQueryParams('end');

  // System
  system = computed(() => this.systemService.system() as RankingSystem);
  systemLoaded = this.systemService.loaded;

  // Ranking place from show level service
  rankingPlace = this.showLevelService.rankingPlace;

  // Filter form
  filter = this.breakdownService.filter;

  // Game type options
  gameTypeOptions = [
    { label: 'Single', value: 'single' },
    { label: 'Double', value: 'double' },
    { label: 'Mix', value: 'mix' },
  ];

  gameTypeControl = new FormControl<RankingType>('single');

  constructor() {
    // Load ranking place when system is ready
    effect(() => {
      const id = this.playerId();
      const systemId = this.systemService.systemId();
      if (id && systemId) {
        this.showLevelService.getRanking(id, systemId);
      }
    });

    // Initialize filter when route params change
    effect(() => {
      this._loadFilter();
    });

    // Update URL when filter changes (except for initial load)
    effect(() => {
      const gameType = this.filter.get('gameType')?.value;
      const end = this.filter.get('end')?.value;
      if (gameType && end) {
        this._updateUrl();
      }
    });

    // Set SEO
    effect(() => {
      const playerId = this.playerId();
      if (playerId) {
        this.seoService.update({
          title: `Ranking breakdown`,
          description: `Ranking breakdown for player`,
          seoType: 'generic',
        });
      }
    });
  }

  private _loadFilter() {
    const sys = this.system();
    const playerId = this.playerId();
    const type = this.type() ?? 'single';
    const endParam = dayjs(); // this.periodEndRoute();

    if (!sys || !playerId) {
      return;
    }
    

    // Default we take last calculation update, if no end is given
    const endPeriod = endParam ? dayjs(endParam) : dayjs(sys.calculationLastUpdate);
    const startPeriod = endPeriod.subtract(sys.periodAmount ?? 1, sys.periodUnit as dayjs.ManipulateType);
    const gamePeriod = startPeriod.subtract(sys.updateIntervalAmount ?? 1, sys.updateIntervalUnit as dayjs.ManipulateType);
    const nextPeriod = startPeriod.add(sys.calculationIntervalAmount ?? 1, sys.calculationIntervalUnit as dayjs.ManipulateType);

    this.gameTypeControl.setValue(type, { emitEvent: false });

    this.breakdownService.filter.patchValue(
      {
        systemId: sys.id,
        playerId: playerId,
        gameType: type,
        start: startPeriod,
        end: endPeriod,
        game: gamePeriod,
        next: nextPeriod,
      },
      { emitEvent: true },
    );
  }

  private _updateUrl() {
    const sys = this.system();
    const currentType = this.type();
    const filterGameType = this.filter.get('gameType')?.value;
    const filterEnd = this.filter.get('end')?.value;

    if (!sys || !filterEnd) {
      return;
    }

    const systemLastUpdate = dayjs(sys.calculationLastUpdate);

    const queryParams: { [key: string]: string | null } = {
      end: systemLastUpdate.isSame(filterEnd, 'day') ? null : filterEnd.format('YYYY-MM-DD'),
    };

    // Only navigate if game type changed
    if (filterGameType && filterGameType !== currentType) {
      this.router.navigate(['..', filterGameType], {
        relativeTo: this.route,
        queryParams,
        queryParamsHandling: 'merge',
      });
    } else if (queryParams['end'] !== this.periodEndRoute()) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams,
        queryParamsHandling: 'merge',
      });
    }
  }

  onGameTypeChange(value: RankingType) {
    this.filter.patchValue({ gameType: value });
  }

  goBack() {
    this.router.navigate(['players', this.playerId()]);
  }
}
