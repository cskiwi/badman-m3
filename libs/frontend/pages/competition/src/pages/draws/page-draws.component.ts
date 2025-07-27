import { DatePipe, SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { SeoService } from '@app/frontend-modules-seo/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { DrawsService } from './page-draws.service';

@Component({
  selector: 'app-page-draws',
  imports: [DatePipe, SlicePipe, ProgressBarModule, RouterModule, TranslateModule, PageHeaderComponent, SkeletonModule],
  templateUrl: './page-draws.component.html',
  styleUrl: './page-draws.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageDrawsComponent {
  private readonly dataService = new DrawsService();
  private readonly seoService = inject(SeoService);
  private readonly competitionId = injectParams('competitionId');
  private readonly subEventId = injectParams('subEventId');
  private readonly drawId = injectParams('drawId');

  // selectors
  competition = this.dataService.competition;
  subEvent = this.dataService.subEvent;
  draw = this.dataService.draw;
  encounters = this.dataService.encounters;

  error = this.dataService.error;
  loading = this.dataService.loading;

  constructor() {
    effect(() => {
      const competitionId = this.competitionId();
      const subEventId = this.subEventId();
      const drawId = this.drawId();
      if (competitionId && subEventId && drawId) {
        this.dataService.filter.get('competitionId')?.setValue(competitionId);
        this.dataService.filter.get('subEventId')?.setValue(subEventId);
        this.dataService.filter.get('drawId')?.setValue(drawId);
      }
    });

    effect(() => {
      const competition = this.competition();
      const subEvent = this.subEvent();
      const draw = this.draw();
      if (competition && subEvent && draw) {
        this.seoService.update({
          seoType: 'generic',
          title: `${competition.name} - ${subEvent.name} - ${draw.name || 'Draw'}`,
          description: `Draw ${draw.name || 'details'} for ${subEvent.name} in competition ${competition.name}`,
        });
      }
    });
  }
}