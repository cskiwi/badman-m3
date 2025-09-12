import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { SyncButtonComponent, SyncButtonConfig } from '@app/frontend-components/sync';
import { SeoService } from '@app/frontend-modules-seo/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DrawDetailService } from './page-draw-detail.service';
import { DrawGamesComponent } from './components/draw-games.component';
import { DrawStandingsTableComponent } from './components/draw-standings-table.component';
import { DrawKoTreeComponent } from './components/draw-ko-tree.component';

@Component({
  selector: 'app-page-draw-detail',
  imports: [
    SlicePipe,
    ProgressBarModule,
    RouterModule,
    TranslateModule,
    PageHeaderComponent,
    ButtonModule,
    SkeletonModule,
    SyncButtonComponent,
    DrawGamesComponent,
    DrawStandingsTableComponent,
    DrawKoTreeComponent,
  ],
  templateUrl: './page-draw-detail.component.html',
  styleUrl: './page-draw-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageDrawDetailComponent {
  private readonly dataService = new DrawDetailService();
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);
  private readonly tournamentId = injectParams('tournamentId');
  private readonly subEventId = injectParams('subEventId');
  readonly drawId = injectParams('drawId');

  // selectors
  tournament = this.dataService.tournament;
  subEvent = this.dataService.subEvent;
  draw = this.dataService.draw;
  draws = this.dataService.draws;
  standings = this.dataService.standings;
  games = this.dataService.games;

  error = this.dataService.error;
  loading = this.dataService.loading;

  // Draw switching
  drawOptions = computed(() => {
    const draws = this.draws();
    return draws.map(draw => ({
      label: draw.name || 'Draw ' + (draw.id.slice(0, 8)),
      value: draw.id,
      draw: draw
    }));
  });

  hasMultipleDraws = computed(() => this.draws().length > 1);

  onDrawChange(selectedDrawId: string) {
    const tournament = this.tournament();
    const subEvent = this.subEvent();
    
    if (tournament && subEvent) {
      this.router.navigate([
        '/', 
        'tournament', 
        tournament.slug, 
        'sub-events', 
        subEvent.id, 
        'draws', 
        selectedDrawId
      ]);
    }
  }

  // Sync configuration
  syncConfig = computed((): SyncButtonConfig | null => {
    const tournament = this.tournament();
    const subEvent = this.subEvent();
    const draw = this.draw();

    if (!tournament || !subEvent || !draw) {
      return null;
    }

    return {
      level: 'draw',
      tournamentCode: tournament.visualCode,
      tournamentName: tournament.name,
      eventCode: subEvent.visualCode || subEvent.id,
      eventName: subEvent.name,
      drawCode: draw.visualCode || draw.id,
      drawName: draw.name || 'Draw',
    };
  });

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
