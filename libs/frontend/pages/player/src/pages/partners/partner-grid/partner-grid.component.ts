import { ChangeDetectionStrategy, Component, effect, inject, input, viewChild, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MtxGrid, MtxGridColumn } from '@ng-matero/extensions/grid';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Player } from '@app/models';
import { PlayerGrid } from './sort.type';

@Component({
  selector: 'app-partner-grid',
  standalone: true,
  imports: [CommonModule, MtxGrid, TranslateModule],
  templateUrl: './partner-grid.component.html',
  styleUrl: './partner-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerGridComponent {
  private readonly translate = inject(TranslateService);
  grid = viewChild<MtxGrid>('grid');

  loading = input<boolean>(false);
  dataSource = input<PlayerGrid[]>([]);

  columns: MtxGridColumn[] = [
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

  constructor() {
    effect(() => {
      const grid = this.grid();

      if (!grid) {
        return;
      }

      // // when sorting on winrate, first sort on winrate, then on amount of games
      // grid.dataSource.sortingDataAccessor = (data: unknown, sortHeaderId: string) => {
      //   const value = (data as PlayerGrid)[sortHeaderId as keyof PlayerGrid];

      //   if (sortHeaderId === 'winRate') {
      //     return [value as string | number;, (data as PlayerGrid).amountOfGames];
      //   }

      //   return value as string | number;
      // };
    });
  }
}
