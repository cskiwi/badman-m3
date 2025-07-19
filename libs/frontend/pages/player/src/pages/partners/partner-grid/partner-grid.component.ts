import { ChangeDetectionStrategy, Component, computed, inject, input, PLATFORM_ID } from '@angular/core';
import { AsyncPipe, DecimalPipe, isPlatformBrowser } from '@angular/common';

import { TableModule } from 'primeng/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PlayerGrid } from './sort.type';

@Component({
  selector: 'app-partner-grid',
  imports: [TableModule, TranslateModule, AsyncPipe, DecimalPipe],
  templateUrl: './partner-grid.component.html',
  styleUrl: './partner-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerGridComponent {
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  loading = input<boolean>(false);
  dataSource = input<PlayerGrid[]>([]);
  viewMode = input<'partners' | 'opponents'>('partners');

  isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  columns = computed(() => {
    const baseColumns = [
      {
        header: this.translate.stream('all.partner.name'),
        field: 'player.fullName',
        sortable: true,
      }
    ];

    // Add partner column for opponent mode
    if (this.viewMode() === 'opponents') {
      baseColumns.push({
        header: this.translate.stream('all.partner.partner'),
        field: 'partner',
        sortable: true,
      });
    }

    baseColumns.push(
      {
        header: this.viewMode() === 'partners' 
          ? this.translate.stream('all.partner.win-rate')
          : this.translate.stream('all.partner.win-rate-against'),
        field: 'winRate',
        sortable: true,
      },
      {
        header: this.translate.stream('all.partner.amount-of-games'),
        field: 'amountOfGames',
        sortable: true,
      }
    );

    return baseColumns;
  });

  get totalGames(): number {
    const data = this.dataSource();
    return Array.isArray(data) ? data.reduce((sum, row) => sum + (row.amountOfGames ?? 0), 0) : 0;
  }

  get averageWinRate(): number {
    const data = this.dataSource();
    if (!Array.isArray(data) || data.length === 0) return 0;
    const total = data.reduce((sum, row) => sum + (row.winRate ?? 0), 0);
    return total / data.length;
  }
}
