
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { TranslateModule } from '@ngx-translate/core';
import { OverviewService } from './page-overview.service';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { CardModule } from 'primeng/card';

@Component({
    selector: 'app-page-overview',
    imports: [
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    ProgressBarModule,
    InputTextModule,
    FloatLabelModule,
    CardModule,
    PageHeaderComponent
],
    templateUrl: './page-overview.component.html',
    styleUrl: './page-overview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageOverviewComponent {
  private readonly dataService = new OverviewService();

  // selectors
  clubs = this.dataService.clubs;
  
  error = this.dataService.error;
  loading = this.dataService.loading;

  query = this.dataService.filter.get('query') as FormControl;

}
