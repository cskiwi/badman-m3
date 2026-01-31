import { Component, OnInit, output, input, inject } from '@angular/core';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SliderModule } from 'primeng/slider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { RankingLastPlace } from '@app/models';

@Component({
  selector: 'app-enrollment-filters',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MultiSelectModule,
    SelectModule,
    ButtonModule,
    CheckboxModule,
    SliderModule,
    TranslateModule
],
  templateUrl: './enrollment-filters.component.html',
})
export class EnrollmentFiltersComponent implements OnInit {
  private readonly translate = inject(TranslateService);

  readonly filters = input<{
    eventType: string[];
    gameType: string[];
    level: number[];
    enrollmentStatus: 'OPEN' | 'AVAILABLE' | 'ALL';
    searchText: string;
    showOnlyMyLevel: boolean;
}>();
  readonly userRanking = input<RankingLastPlace | null>();
  readonly userGender = input<'M' | 'F' | null>();
  readonly filtersChange = output<{
    eventType: string[];
    gameType: string[];
    level: number[];
    enrollmentStatus: 'OPEN' | 'AVAILABLE' | 'ALL';
    searchText: string;
    showOnlyMyLevel: boolean;
}>();

  // Form controls
  eventTypeControl = new FormControl<string[]>([]);
  gameTypeControl = new FormControl<string[]>([]);
  levelRangeControl = new FormControl<number[]>([1, 12]);
  enrollmentStatusControl = new FormControl<string>('AVAILABLE');
  showOnlyMyLevelControl = new FormControl<boolean>(true);

  // Options - will be populated with translated labels in ngOnInit
  eventTypeOptions: { value: string; label: string }[] = [];
  gameTypeOptions: { value: string; label: string }[] = [];
  enrollmentStatusOptions: { value: string; label: string }[] = [];

  ngOnInit(): void {
    // Initialize options with translations
    this.eventTypeOptions = [
      { value: 'M', label: this.translate.instant('all.tournament.eventTypes.men') },
      { value: 'F', label: this.translate.instant('all.tournament.eventTypes.women') },
      { value: 'MX', label: this.translate.instant('all.tournament.eventTypes.mixed') },
      { value: 'NATIONAL', label: this.translate.instant('all.tournament.eventTypes.national') },
    ];

    this.gameTypeOptions = [
      { value: 'S', label: this.translate.instant('all.tournament.gameTypes.singles') },
      { value: 'D', label: this.translate.instant('all.tournament.gameTypes.doubles') },
      { value: 'MX', label: this.translate.instant('all.tournament.gameTypes.mixed') },
    ];

    this.enrollmentStatusOptions = [
      { value: 'ALL', label: this.translate.instant('all.enrollment.filters.statusOptions.all') },
      { value: 'AVAILABLE', label: this.translate.instant('all.enrollment.filters.statusOptions.available') },
      { value: 'OPEN', label: this.translate.instant('all.enrollment.filters.statusOptions.open') },
    ];

    // Initialize form values from input
    const filters = this.filters();
    if (filters) {
      this.eventTypeControl.setValue(filters.eventType || []);
      this.gameTypeControl.setValue(filters.gameType || []);
      if (filters.level && filters.level.length > 0) {
        const min = Math.min(...filters.level);
        const max = Math.max(...filters.level);
        this.levelRangeControl.setValue([min, max]);
      }
      this.enrollmentStatusControl.setValue(filters.enrollmentStatus || 'AVAILABLE');
      this.showOnlyMyLevelControl.setValue(filters.showOnlyMyLevel ?? true);
    } else {
      // Default: select user's gender + mixed
      const gender = this.userGender();
      const defaultEventTypes: string[] = ['MX']; // Always include Mixed
      if (gender === 'M') {
        defaultEventTypes.push('M');
      } else if (gender === 'F') {
        defaultEventTypes.push('F');
      }
      this.eventTypeControl.setValue(defaultEventTypes);

      // Default: prefill level range based on user's ranking
      const ranking = this.userRanking();
      if (ranking) {
        const levels: number[] = [];
        if (ranking.single) levels.push(ranking.single);
        if (ranking.double) levels.push(ranking.double);
        if (ranking.mix) levels.push(ranking.mix);

        if (levels.length > 0) {
          const minLevel = Math.min(...levels);
          const maxLevel = Math.max(...levels);
          this.levelRangeControl.setValue([minLevel, maxLevel]);
        }
      }

      // Emit initial filters
      this.emitFilters();
    }

    // Subscribe to form changes
    this.eventTypeControl.valueChanges.subscribe(() => this.emitFilters());
    this.gameTypeControl.valueChanges.subscribe(() => this.emitFilters());
    this.enrollmentStatusControl.valueChanges.subscribe(() => this.emitFilters());
    this.showOnlyMyLevelControl.valueChanges.subscribe(() => this.emitFilters());
  }

  /**
   * Emit filter changes
   */
  private emitFilters(): void {
    // Build level array from range control
    const levelArray: number[] = [];
    const range = this.levelRangeControl.value;

    if (range && range.length === 2) {
      const [min, max] = range;
      for (let i = min; i <= max; i++) {
        levelArray.push(i);
      }
    }

    const filters = {
      eventType: this.eventTypeControl.value || [],
      gameType: this.gameTypeControl.value || [],
      level: levelArray,
      enrollmentStatus: (this.enrollmentStatusControl.value || 'AVAILABLE') as 'OPEN' | 'AVAILABLE' | 'ALL',
      searchText: '',
      showOnlyMyLevel: this.showOnlyMyLevelControl.value ?? true,
    };
    this.filtersChange.emit(filters);
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    // Reset to defaults: user's gender + mixed
    const gender = this.userGender();
    const defaultEventTypes: string[] = ['MX'];
    if (gender === 'M') {
      defaultEventTypes.push('M');
    } else if (gender === 'F') {
      defaultEventTypes.push('F');
    }

    this.eventTypeControl.setValue(defaultEventTypes);
    this.gameTypeControl.setValue([]);

    // Reset level to user's ranking range, or 1-12 if no ranking
    const ranking = this.userRanking();
    if (ranking) {
      const levels: number[] = [];
      if (ranking.single) levels.push(ranking.single);
      if (ranking.double) levels.push(ranking.double);
      if (ranking.mix) levels.push(ranking.mix);

      if (levels.length > 0) {
        const minLevel = Math.min(...levels);
        const maxLevel = Math.max(...levels);
        this.levelRangeControl.setValue([minLevel, maxLevel]);
      } else {
        this.levelRangeControl.setValue([1, 12]);
      }
    } else {
      this.levelRangeControl.setValue([1, 12]);
    }

    this.enrollmentStatusControl.setValue('AVAILABLE');
    this.showOnlyMyLevelControl.setValue(false);
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(): boolean {
    const range = this.levelRangeControl.value;

    // Determine default level range
    let defaultMinLevel = 1;
    let defaultMaxLevel = 12;
    const ranking = this.userRanking();
    if (ranking) {
      const levels: number[] = [];
      if (ranking.single) levels.push(ranking.single);
      if (ranking.double) levels.push(ranking.double);
      if (ranking.mix) levels.push(ranking.mix);

      if (levels.length > 0) {
        defaultMinLevel = Math.min(...levels);
        defaultMaxLevel = Math.max(...levels);
      }
    }

    const hasLevelFilter = range && (range[0] !== defaultMinLevel || range[1] !== defaultMaxLevel);

    // Check if eventType is different from default (gender + mixed)
    const gender = this.userGender();
    const defaultEventTypes: string[] = ['MX'];
    if (gender === 'M') {
      defaultEventTypes.push('M');
    } else if (gender === 'F') {
      defaultEventTypes.push('F');
    }
    const currentEventTypes = this.eventTypeControl.value || [];
    const hasEventTypeFilter =
      currentEventTypes.length !== defaultEventTypes.length ||
      !currentEventTypes.every(t => defaultEventTypes.includes(t));

    return (
      hasEventTypeFilter ||
      (this.gameTypeControl.value?.length ?? 0) > 0 ||
      hasLevelFilter ||
      this.enrollmentStatusControl.value !== 'AVAILABLE' ||
      this.showOnlyMyLevelControl.value === true
    );
  }

  /**
   * Check if user has ranking data
   */
  hasRanking(): boolean {
    const userRanking = this.userRanking();
    return !!(userRanking && (userRanking.single || userRanking.double || userRanking.mix));
  }

  /**
   * Handle level slider end - emit filters when user releases the slider
   */
  onLevelSlideEnd(): void {
    this.emitFilters();
  }
}
