import { ChangeDetectionStrategy, Component, effect, inject, input, PLATFORM_ID } from '@angular/core';
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { RankingSystemService } from '@app/frontend-modules-graphql/ranking';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HomeService } from './page-home.service';

@Component({
  selector: 'app-page-home',
  imports: [PageHeaderComponent, TableModule, TranslateModule, CardModule, AsyncPipe],
  templateUrl: './page-home.component.html',
  styleUrl: './page-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHomeComponent {
  private readonly dataService = new HomeService();
  private readonly translate = inject(TranslateService);
  private readonly rankingSystemService = inject(RankingSystemService);
  private readonly platformId = inject(PLATFORM_ID);

  id = input<string | null>(null);

  isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  columns = [
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

  dataSource = this.dataService.table;
  loading = this.dataService.loading;
  error = this.dataService.error;

  constructor() {
    effect(() => {
      this.dataService.filter.patchValue({
        rankingSystemId: this.rankingSystemService.systemId(),
      });
    });

    // this.http.get(`${this.baseUrl}/api/health/test`).subscribe();
  }
}
