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
import { SeoService } from '@app/frontend-modules-seo/service';
import { LayoutComponent } from '@app/frontend-components/layout';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ShowLevelComponent } from './components/show-level.component';

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
    ShowLevelComponent
  ],
  templateUrl: './page-detail.component.html',
  styleUrl: './page-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageDetailComponent {
  private readonly dataService = new DetailService();
  private readonly seoService = inject(SeoService);
  private readonly playerId = injectParams('playerId');

  // selectors
  player = this.dataService.player;
  club = this.dataService.club;
  error = this.dataService.error;
  loading = this.dataService.loading;

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