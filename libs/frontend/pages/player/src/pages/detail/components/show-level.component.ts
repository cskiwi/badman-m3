import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, OnInit, computed, effect, inject, input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ShowLevelService } from './show-level.service';
import { RankingSystemService } from '@app/frontend-modules-graphql/ranking';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-show-level',
  imports: [CommonModule, TooltipModule],
  templateUrl: './show-level.component.html',
  styleUrl: './show-level.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowLevelComponent implements OnInit {
  showLevelService = inject(ShowLevelService);
  private readonly rankingService = inject(RankingSystemService);
  private readonly injector = inject(Injector);
  private readonly translate = inject(TranslateService);

  playerId = input.required<string>();
  type = input.required<'single' | 'double' | 'mix'>();

  upgrade!: 'singlePoints' | 'doublePoints' | 'mixPoints';
  downgrade!: 'singlePointsDowngrade' | 'doublePointsDowngrade' | 'mixPointsDowngrade';

  tooltip = computed(() => {
    let tooltip = '';
    if (this.nextLevel()) {
      tooltip = `${this.translate.instant('all.ranking.breakdown.upgrade')}: > ${this.nextLevel()}`;
    }

    if (this.prevLevel() && this.nextLevel()) {
      tooltip += '\n';
    }

    if (this.prevLevel()) {
      tooltip += `${this.translate.instant('all.ranking.breakdown.downgrade')}: < ${this.prevLevel()}`;
    }

    return tooltip;
  });

  maxLevel = computed(() => this.rankingService.system()?.amountOfLevels ?? 12);
  level = computed(() => this.showLevelService.rankingPlace()?.[this.type()] ?? this.maxLevel());
  nextLevel = computed(() => (this.level() == 1 ? undefined : this.rankingService.system()?.pointsToGoUp?.[this.maxLevel() - this.level()]));
  prevLevel = computed(() =>
    this.level() == this.maxLevel() ? undefined : this.rankingService.system()?.pointsToGoDown?.[this.maxLevel() - (this.level() + 1)],
  );
  canUpgrade = computed(() => (this.level() == 1 ? false : (this.showLevelService.rankingPlace()?.[this.upgrade] ?? 0) >= (this.nextLevel() ?? -1)));
  canDowngrade = computed(() =>
    this.level() == this.maxLevel() ? false : (this.showLevelService.rankingPlace()?.[this.downgrade] ?? 0) <= (this.prevLevel() ?? -1),
  );

  ngOnInit() {
    effect(
      () => {
        const id = this.rankingService.systemId();
        if (!id) {
          return;
        }

        this.showLevelService.getRanking(this.playerId(), id);
      },
      {
        injector: this.injector,
      },
    );

    this.upgrade = `${this.type()}Points`;
    this.downgrade = `${this.type()}PointsDowngrade`;
  }
}
