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
  standalone: true,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageDetailComponent {
  private readonly dataService = new DetailService();
  private readonly seoService = inject(SeoService);
  private readonly competitionId = injectParams('competitionId');

  // selectors
  competition = this.dataService.competition;

  error = this.dataService.error;
  loading = this.dataService.loading;

  constructor() {
    effect(() => {
      this.dataService.filter.get('competitionId')?.setValue(this.competitionId());
    });

    effect(() => {
      const competition = this.competition();
      if (competition) {
        this.seoService.update({
          seoType: 'competition',
          competition,
        });
      }
    });
  }
}
