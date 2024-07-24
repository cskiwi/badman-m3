import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { LayoutComponent } from '@app/frontend-components/layout';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { OverviewService } from './page-overview.service';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'lib-page-overview',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,

    MatListModule,
    MatProgressBarModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,

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
  clubs = this.dataService.state.clubs;
  
  error = this.dataService.error;
  loading = this.dataService.loading;

  query = this.dataService.filter.get('query') as FormControl;

}