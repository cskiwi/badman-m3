import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { SyncButtonComponent, SyncButtonConfig } from '@app/frontend-components/sync';
import { SeoService } from '@app/frontend-modules-seo/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { EncounterCardComponent } from './components/encounter-card.component';
import { PouleDrawComponent } from './components/poule-draw.component';
import { QualificationDrawComponent } from './components/qualification-draw.component';
import { DrawsService } from './page-draws.service';

@Component({
  selector: 'app-page-draws',
  imports: [
    SlicePipe,
    ProgressBarModule,
    RouterModule,
    TranslateModule,
    PageHeaderComponent,
    SkeletonModule,
    SyncButtonComponent,
    PouleDrawComponent,
    QualificationDrawComponent,
    EncounterCardComponent,
  ],
  templateUrl: './page-draws.component.html',
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
  standings = this.dataService.standings;

  error = this.dataService.error;
  loading = this.dataService.loading;

  // Sync configuration for competition draw
  syncConfig = computed((): SyncButtonConfig | null => {
    const competition = this.competition();
    const subEvent = this.subEvent();
    const draw = this.draw();

    if (!competition || !subEvent || !draw) {
      return null;
    }

    return {
      level: 'draw',
      drawId: draw.id,
      eventName: competition.name,
      subEventName: subEvent.name,
      drawName: draw.name || 'Draw',
    };
  });

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

  // Method to handle loading games for an encounter
  onLoadGames = async (encounterId: string): Promise<void> => {
    await this.dataService.loadEncounterGames(encounterId);
  };
}
