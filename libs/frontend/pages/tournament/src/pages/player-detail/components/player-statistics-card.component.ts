import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { type PlayerStatistics } from '../page-player-detail.service';

@Component({
  selector: 'app-player-statistics-card',
  imports: [DecimalPipe, TranslateModule, CardModule, ProgressBarModule],
  templateUrl: './player-statistics-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerStatisticsCardComponent {
  statistics = input.required<PlayerStatistics>();
}
