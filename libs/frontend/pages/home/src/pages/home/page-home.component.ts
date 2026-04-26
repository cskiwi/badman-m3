import { AsyncPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, PLATFORM_ID } from '@angular/core';
import { HeroAvatarComponent, HeroComponent, HeroTitleComponent } from '@app/frontend-components/hero';
import { PlayerRankingProgressComponent } from '@app/frontend-components/player-ranking-progress';
import { SectionHeaderComponent } from '@app/frontend-components/section-header';
import { AuthService } from '@app/frontend-modules-auth/service';
import { RankingSystemService } from '@app/frontend-modules-graphql/ranking';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ProgressBarModule } from 'primeng/progressbar';
import { HomeService } from './page-home.service';

@Component({
  selector: 'app-page-home',
  imports: [
    AsyncPipe,
    DatePipe,
    TranslateModule,
    ProgressBarModule,
    HeroComponent,
    HeroAvatarComponent,
    HeroTitleComponent,
    PlayerRankingProgressComponent,
    SectionHeaderComponent,
  ],
  templateUrl: './page-home.component.html',
  styleUrl: './page-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHomeComponent {
  private readonly dataService = new HomeService();
  private readonly translate = inject(TranslateService);
  private readonly rankingSystemService = inject(RankingSystemService);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  id = input<string | null>(null);

  isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  columns = [
    {
      header: this.translate.stream('all.points.table.level'),
      field: 'level',
    },
    {
      header: this.translate.stream('all.points.table.points-needed-up'),
      field: 'pointsToGoUp',
    },
    {
      header: this.translate.stream('all.points.table.points-needed-down'),
      field: 'pointsToGoDown',
    },
    {
      header: this.translate.stream('all.points.table.points-won'),
      field: 'pointsWhenWinningAgainst',
    },
  ];

  dataSource = computed(() => [...this.dataService.table()].sort((a, b) => a.level - b.level));
  loading = this.dataService.loading;
  error = this.dataService.error;
  rankingSystem = this.dataService.rankingSystem;
  user = this.auth.user;

  constructor() {
    effect(() => {
      this.dataService.filter.patchValue({
        rankingSystemId: this.rankingSystemService.systemId(),
      });
    });
  }
}
