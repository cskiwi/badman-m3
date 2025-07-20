
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { OverviewService } from './page-overview.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-page-overview',
    imports: [
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    InputTextModule,
    ProgressBarModule,
    CardModule,
    ButtonModule,
    PageHeaderComponent
],
    templateUrl: './page-overview.component.html',
    styleUrl: './page-overview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageOverviewComponent {
  private readonly dataService = new OverviewService();

  // selectors
  players = this.dataService.players;
  
  error = this.dataService.error;
  loading = this.dataService.loading;

  query = this.dataService.filter.get('query') as FormControl;
}
