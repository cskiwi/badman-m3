import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { SeoService } from '@app/frontend-modules-seo/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { DetailService } from './page-detail.service';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
  selector: 'app-page-detail',
  imports: [ProgressBarModule, RouterModule, TranslateModule, PageHeaderComponent],
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
