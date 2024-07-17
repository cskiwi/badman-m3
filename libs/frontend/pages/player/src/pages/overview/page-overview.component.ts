import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { LayoutComponent } from '@app/frontend-components';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { OverviewService } from './page-overview.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'lib-page-overview',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,

    MatListModule,
    MatProgressBarModule,
    MatIconModule,

    LayoutComponent,
    PageHeaderComponent,
  ],
  templateUrl: './page-overview.component.html',
  styleUrl: './page-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageOverviewComponent {
  private readonly dataService = new OverviewService();

  // selectors
  players = this.dataService.state.players;
  
  error = this.dataService.error;
  loading = this.dataService.loading;
}
