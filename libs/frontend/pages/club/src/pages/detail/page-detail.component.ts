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
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { DetailService } from './page-detail.service';

@Component({
    selector: 'app-page-detail',
    imports: [
        CommonModule,
        MatProgressBarModule,
        MatIconModule,
        MatButtonModule,
        RouterModule,
        TranslateModule,
        PageHeaderComponent,
        RecentGamesComponent,
        UpcomingGamesComponent,
    ],
    templateUrl: './page-detail.component.html',
    styleUrl: './page-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
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
