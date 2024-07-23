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
import { USER, AUTH } from '@app/frontend-utils';
import { RecentGamesComponent } from '@app/frontend-components/games/recent';
import { UpcomingGamesComponent } from '@app/frontend-components/games/upcoming';

@Component({
  selector: 'lib-page-detail',
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
  private readonly clubId = injectParams('clubId');

  // selectors
  club = this.dataService.club;
  teamIds = computed(() => this.club()?.teams?.map((team) => team.id));

  error = this.dataService.error;
  loading = this.dataService.loading;

  user = inject(USER);
  auth = inject(AUTH);


  constructor() {
    effect(() => {
      this.dataService.filter.get('clubId')?.setValue(this.clubId());
    });

    effect(() => {
      const club = this.club();
      if (club) {
        this.seoService.update({
          seoType: 'club',
          club,
        });
      }
    });
  }
}
