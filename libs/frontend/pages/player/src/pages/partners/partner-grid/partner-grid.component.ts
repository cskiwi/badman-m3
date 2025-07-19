import { ChangeDetectionStrategy, Component, inject, input, PLATFORM_ID, Input, Output, EventEmitter } from '@angular/core';
import { AsyncPipe, isPlatformBrowser } from '@angular/common';

import { TableModule } from 'primeng/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PlayerGrid } from './sort.type';

@Component({
    selector: 'app-partner-grid',
    imports: [TableModule, TranslateModule, AsyncPipe],
    templateUrl: './partner-grid.component.html',
    styleUrl: './partner-grid.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartnerGridComponent {
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  loading = input<boolean>(false);
  dataSource = input<PlayerGrid[]>([]);

  @Input() page = 1;
  @Input() pageSize = 20;
  @Input() total = 0;
  @Output() pageChange = new EventEmitter<{ page: number; pageSize: number }>();

  isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  onPageChange(event: { first: number; rows: number; page?: number; pageCount?: number }) {
    // Calculate page if not present (PrimeNG TablePageEvent may not provide page/pageCount)
    const page = event.page !== undefined ? event.page + 1 : Math.floor((event.first ?? 0) / (event.rows ?? 1)) + 1;
    this.pageChange.emit({ page, pageSize: event.rows });
  }

  columns = [
    {
      header: this.translate.stream('all.partner.name'),
      field: 'player.fullName',
      sortable: true,
    },
    {
      header: this.translate.stream('all.partner.win-rate'),
      field: 'winRate',
      sortable: true,
    },
    {
      header: this.translate.stream('all.partner.amount-of-games'),
      field: 'amountOfGames',
      sortable: true,
    },
  ];
}
