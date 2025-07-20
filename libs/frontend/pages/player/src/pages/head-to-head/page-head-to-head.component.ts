import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '@app/frontend-modules-auth/service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { DetailService } from './page-head-to-head.service';
import { HeadToHeadGridComponent } from './head-to-head-grid/head-to-head-grid.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { IftaLabelModule } from 'primeng/iftalabel';

@Component({
  selector: 'app-page-head-to-head',
  imports: [
    CardModule,
    ProgressBarModule,
    ButtonModule,
    RouterModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    InputTextModule,
    HeadToHeadGridComponent,
    DatePickerModule,
    SelectModule,
    IftaLabelModule,
  ],
  templateUrl: './page-head-to-head.component.html',
  styleUrl: './page-head-to-head.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeadToHeadComponent {
  private readonly dataService = new DetailService();
    private readonly playerId = injectParams('playerId');
    private readonly translateService = inject(TranslateService);
  
    // Expose service properties
    filter = this.dataService.filter;
    memberships = this.dataService.memberships;
    error = this.dataService.error;
    loading = this.dataService.loading;
    data = this.dataService.data;
    player = this.dataService.player;
  
    auth = inject(AuthService);
  
    // Options for PrimeNG selects
    linkTypeOptions = [
      { value: null, label: this.translateService.instant('all.head-to-head.filters.all') },
      { value: 'competition', label: this.translateService.instant('all.head-to-head.filters.competition') },
      { value: 'tournament', label: this.translateService.instant('all.head-to-head.filters.tournament') },
    ];
  
    gameTypeOptions = [
      { value: null, label: this.translateService.instant('all.head-to-head.filters.all') },
      { value: 'MX', label: this.translateService.instant('all.head-to-head.filters.mix') },
      { value: 'D', label: this.translateService.instant('all.head-to-head.filters.double') },
      { value: 'S', label: this.translateService.instant('all.head-to-head.filters.single') },
    ];
  
    viewModeOptions = [
      { value: 'partners', label: this.translateService.instant('all.head-to-head.filters.partners') },
      { value: 'opponents', label: this.translateService.instant('all.head-to-head.filters.opponents') },
    ];
  
    // Partner club options from service with "All" option
    partnerClubOptions = computed(() => [{ value: null, label: this.translateService.instant('all.head-to-head.filters.all') }, ...this.dataService.partnerClubOptions()]);
  
    // Opponent club options from service with "All" option
    opponentClubOptions = computed(() => [{ value: null, label: this.translateService.instant('all.head-to-head.filters.all') }, ...this.dataService.opponentClubOptions()]);
  
    // Partner options from service with "All" option (for opponent filtering)
    partnerOptions = computed(() => [
      { value: null, label: this.translateService.instant('all.head-to-head.filters.all') },
      ...this.dataService.partnerOptions(),
    ]);
  
    // Convert form values to signals for reactivity
    private viewModeSignal = toSignal(this.filter.get('viewMode')!.valueChanges, { initialValue: 'partners' });
  
    // Check if we're in opponent mode
    isOpponentMode = computed(() => this.viewModeSignal() === 'opponents');
  
    // UI state management
    filtersExpanded = signal(true);
    showExplanation = signal(this.shouldShowExplanation());
  
    private shouldShowExplanation(): boolean {
      if (typeof localStorage === 'undefined') return true;
      return localStorage.getItem('partners-explanation-dismissed') !== 'true';
    }
  
    toggleFilters(): void {
      this.filtersExpanded.update((expanded) => !expanded);
    }
  
    dismissExplanation(): void {
      this.showExplanation.set(false);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('partners-explanation-dismissed', 'true');
      }
    }
  
    constructor() {
      effect(() => {
        this.filter.get('playerId')?.setValue(this.playerId());
      });
  
      // Clear mode-specific filters when switching modes
      effect(() => {
        const viewMode = this.filter.get('viewMode')?.value;
        if (viewMode === 'partners') {
          this.filter.get('partnerFilter')?.setValue(null);
          this.filter.get('opponentClub')?.setValue(null);
        } else {
          this.filter.get('partnerClub')?.setValue(null);
        }
      });
    }
}
