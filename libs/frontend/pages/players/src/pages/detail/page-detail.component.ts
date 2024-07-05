import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
} from '@angular/core';
import { injectParams } from 'ngxtension/inject-params';
import { DetailService } from './page-detail.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SeoService } from '@app/frontend-seo';

@Component({
  selector: 'lib-page-detail',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule],
  templateUrl: './page-detail.component.html',
  styleUrl: './page-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageDetailComponent {
  private readonly dataService = new DetailService();
  private readonly seoService = inject(SeoService);
  private readonly playerId = injectParams('playerId');

  // selectors
  player = this.dataService.state.player;
  error = this.dataService.state.error;
  loading = this.dataService.state.loading;

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
