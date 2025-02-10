import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { TranslateModule } from '@ngx-translate/core';
import { OverviewService } from './page-overview.service';

@Component({
    selector: 'app-page-overview',
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
        PageHeaderComponent,
    ],
    templateUrl: './page-overview.component.html',
    styleUrl: './page-overview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageOverviewComponent {
  private readonly dataService = new OverviewService();

  // selectors
  competitions = this.dataService.state.competitions;
  
  error = this.dataService.error;
  loading = this.dataService.loading;

  query = this.dataService.filter.get('query') as FormControl;

}
