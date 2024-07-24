import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { injectParams } from 'ngxtension/inject-params';
import { DetailService } from './page-detail.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SeoService } from '@app/frontend-modules-seo/service';
import { LayoutComponent } from '@app/frontend-components/layout';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ShowLevelComponent } from './components/show-level.component';
import { USER, AUTH } from '@app/frontend-utils';
import { RecentGamesComponent } from '@app/frontend-components/games/recent';
import { UpcomingGamesComponent } from '@app/frontend-components/games/upcoming';

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

    LayoutComponent,
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

  user = inject(USER);
  auth = inject(AUTH);

  clubs = computed(
    () =>
      (this.user()?.clubPlayerMemberships ?? [])
        .filter((membership) => membership?.active)
        .sort((a, b) => {
          console.log(a?.membershipType, b?.membershipType);
          return 0;
        }),
    // .sort((a, b) => {
    //   // sort by membership type, first normal then loan
    //   if (a?.membershipType === b?.membershipType) {
    //     return 0;
    //   }

    //   if (a?.membershipType === ClubMembershipType.NORMAL) {
    //     return -1;
    //   }

    //   if (b?.membershipType === ClubMembershipType.NORMAL) {
    //     return 1;
    //   }

    //   return 0;
    // }),
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
