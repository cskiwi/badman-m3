import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { RankingSystemService } from '@app/frontend-modules-graphql/ranking';
import { MtxGrid, MtxGridColumn } from '@ng-matero/extensions/grid';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HomeService } from './page-home.service';
import { BASE_URL } from '@app/frontend-utils';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-page-home',
    imports: [CommonModule, PageHeaderComponent, MtxGrid, MatIconModule, TranslateModule],
    templateUrl: './page-home.component.html',
    styleUrl: './page-home.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHomeComponent {
  private readonly dataService = new HomeService();
  private readonly translate = inject(TranslateService);
  private readonly rankingSystemService = inject(RankingSystemService);

  id = input<string | null>(null);

  columns: MtxGridColumn[] = [
    {
      header: this.translate.stream('all.points.table.level'),
      field: 'level',
    },
    {
      header: this.translate.stream('all.points.table.points-needed-up'),
      field: 'pointsToGoUp',
    },
    {
      header: this.translate.stream('all.points.table.points-needed-down'),
      field: 'pointsToGoDown',
    },
    {
      header: this.translate.stream('all.points.table.points-won'),
      field: 'pointsWhenWinningAgainst',
    },
  ];

  dataSource = this.dataService.state.table;
  loading = this.dataService.loading;
  error = this.dataService.state.error;

  constructor() {
    effect(() => {
      this.dataService.filter.patchValue({
        rankingSystemId: this.rankingSystemService.systemId(),
      });
    });

    // this.http.get(`${this.baseUrl}/api/health/test`).subscribe();
  }
}
