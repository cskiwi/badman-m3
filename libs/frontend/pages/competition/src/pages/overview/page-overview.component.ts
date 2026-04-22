import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { OverviewService } from './page-overview.service';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-page-overview',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    ProgressBarModule,
    InputTextModule,
  ],
  templateUrl: './page-overview.component.html',
  styleUrl: './page-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageOverviewComponent {
  private readonly dataService = new OverviewService();

  // selectors
  competitions = this.dataService.competitions;

  error = this.dataService.error;
  loading = this.dataService.loading;

  query = this.dataService.filter.get('query') as FormControl;
}
