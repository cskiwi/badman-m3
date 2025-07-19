import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '@app/frontend-modules-auth/service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { DetailService } from './page-partner.service';
import { PartnerGridComponent } from './partner-grid/partner-grid.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { IftaLabelModule } from 'primeng/iftalabel';

@Component({
  selector: 'app-page-partner',
  imports: [
    CardModule,
    ProgressBarModule,
    ButtonModule,
    RouterModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    InputTextModule,
    PartnerGridComponent,
    DatePickerModule,
    SelectModule,
    IftaLabelModule,
  ],
  templateUrl: './page-partner.component.html',
  styleUrl: './page-partner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagePartnerComponent {
  private readonly dataService = new DetailService();
  private readonly playerId = injectParams('playerId');
  private readonly translateService = inject(TranslateService);

  // Expose service properties
  filter = this.dataService.filter;
  memberships = this.dataService.memberships;
  error = this.dataService.error;
  loading = this.dataService.loading;
  partners = this.dataService.partners;

  auth = inject(AuthService);

  // Options for PrimeNG selects
  linkTypeOptions = [
    { value: null, label: this.translateService.instant('all.partner.filters.all') },
    { value: 'competition', label: this.translateService.instant('all.partner.filters.competition') },
    { value: 'tournament', label: this.translateService.instant('all.partner.filters.tournament') },
  ];

  gameTypeOptions = [
    { value: null, label: this.translateService.instant('all.partner.filters.all') },
    { value: 'MX', label: this.translateService.instant('all.partner.filters.mix') },
    { value: 'D', label: this.translateService.instant('all.partner.filters.double') },
  ];

  // Club options from service with "All" option
  clubOptions = computed(() => [{ value: null, label: this.translateService.instant('all.partner.filters.all') }, ...this.dataService.clubOptions()]);

  constructor() {
    effect(() => {
      this.filter.get('playerId')?.setValue(this.playerId());
    });
  }
}
