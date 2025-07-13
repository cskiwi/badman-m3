
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { RecentGamesComponent } from '@app/frontend-components/games/recent';
import { UpcomingGamesComponent } from '@app/frontend-components/games/upcoming';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { SeoService } from '@app/frontend-modules-seo/service';
import { AuthService } from '@app/frontend-modules-auth/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { ShowLevelComponent } from './components/show-level.component';
import { DetailService } from './page-detail.service';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { CardModule } from 'primeng/card';

@Component({
    selector: 'app-page-detail',
    imports: [
    ProgressBarModule,
    ButtonModule,
    CardModule,
    RouterModule,
    TranslateModule,
    PageHeaderComponent,
    ShowLevelComponent,
    RecentGamesComponent,
    UpcomingGamesComponent
],
    templateUrl: './page-detail.component.html',
    styleUrl: './page-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageDetailComponent {
  private readonly dataService = new DetailService();
  private readonly seoService = inject(SeoService);
  private readonly playerId = injectParams('playerId');

  // selectors
  player = this.dataService.player;
  club = this.dataService.club;
  error = this.dataService.error;
  loading = this.dataService.loading;

  auth = inject(AuthService);

  user = this.auth.user;

  clubs = computed(() =>
    (this.user()?.clubPlayerMemberships ?? []).filter(
      (membership) => membership?.active,
    ),
  );

  constructor() {
    effect(() => {
      this.dataService.filter.get('playerId')?.setValue(this.playerId());
    });

    effect(() => {
      const player = this.player();
      if (player) {
        this.seoService.update({
          seoType: 'player',
          player,
        });
      }
    });
  }
}
