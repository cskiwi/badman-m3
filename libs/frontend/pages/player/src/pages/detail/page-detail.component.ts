import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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

@Component({
  selector: 'app-page-detail',
  standalone: true,
  imports: [
    CommonModule,

    MatProgressBarModule,
    MatIconModule,
    MatButtonModule,

    RouterModule,
    TranslateModule,

    PageHeaderComponent,
    ShowLevelComponent,
    RecentGamesComponent,
    UpcomingGamesComponent,
  ],
  templateUrl: './page-detail.component.html',
  styleUrl: './page-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    (this.user()?.clubPlayerMemberships ?? [])
      .filter((membership) => membership?.active)
      .sort((a, b) => {
        console.log(a?.membershipType, b?.membershipType);
        return 0;
      }),
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
