import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { SeoService } from '@app/frontend-modules-seo/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { DrawDetailService } from './page-draw-detail.service';

@Component({
  selector: 'app-page-draw-detail',
  imports: [SlicePipe, ProgressBarModule, RouterModule, TranslateModule, PageHeaderComponent, SkeletonModule],
  templateUrl: './page-draw-detail.component.html',
  styleUrl: './page-draw-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageDrawDetailComponent {
  private readonly dataService = new DrawDetailService();
  private readonly seoService = inject(SeoService);
  private readonly tournamentId = injectParams('tournamentId');
  private readonly subEventId = injectParams('subEventId');
  private readonly drawId = injectParams('drawId');

  // selectors
  tournament = this.dataService.tournament;
  subEvent = this.dataService.subEvent;
  draw = this.dataService.draw;
  standings = this.dataService.standings;

  error = this.dataService.error;
  loading = this.dataService.loading;

  constructor() {
    effect(() => {
      const tournamentId = this.tournamentId();
      const subEventId = this.subEventId();
      const drawId = this.drawId();
      if (tournamentId && subEventId && drawId) {
        this.dataService.filter.get('tournamentId')?.setValue(tournamentId);
        this.dataService.filter.get('subEventId')?.setValue(subEventId);
        this.dataService.filter.get('drawId')?.setValue(drawId);
      }
    });

    effect(() => {
      const tournament = this.tournament();
      const subEvent = this.subEvent();
      const draw = this.draw();
      if (tournament && subEvent && draw) {
        this.seoService.update({
          seoType: 'generic',
          title: `${tournament.name} - ${subEvent.name} - ${draw.name || 'Draw'} - Standings`,
          description: `Standings for ${draw.name || 'Draw'} in ${subEvent.name} of tournament ${tournament.name}`,
        });
      }
    });
  }
}