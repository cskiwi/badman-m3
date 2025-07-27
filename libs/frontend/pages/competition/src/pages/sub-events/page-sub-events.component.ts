import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { SeoService } from '@app/frontend-modules-seo/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { SubEventsService } from './page-sub-events.service';

@Component({
  selector: 'app-page-sub-events',
  imports: [SlicePipe, ProgressBarModule, RouterModule, TranslateModule, PageHeaderComponent, SkeletonModule],
  templateUrl: './page-sub-events.component.html',
  styleUrl: './page-sub-events.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageSubEventsComponent {
  private readonly dataService = new SubEventsService();
  private readonly seoService = inject(SeoService);
  private readonly competitionId = injectParams('competitionId');

  // selectors
  competition = this.dataService.competition;
  subEvents = this.dataService.subEvents;

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
          seoType: 'generic',
          title: `${competition.name} - Sub Events`,
          description: `Sub events for competition ${competition.name}`,
        });
      }
    });
  }
}
