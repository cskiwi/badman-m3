import { ChangeDetectionStrategy, Component, inject, input, PLATFORM_ID } from '@angular/core';
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

  isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
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
