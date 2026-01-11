import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DataViewModule } from 'primeng/dataview';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { PaginatorModule } from 'primeng/paginator';
import { PanelModule } from 'primeng/panel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';

// Service and Types
import { 
  ClubSearchService, 
  ClubWithStats, 
  ClubAutoCompleteItem, 
  SortOption, 
  ViewMode 
} from './club-search.service';

@Component({
  selector: 'app-club-search',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    // PrimeNG
    AutoCompleteModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    DataViewModule,
    DividerModule,
    DropdownModule,
    FloatLabelModule,
    InputNumberModule,
    PaginatorModule,
    PanelModule,
    ProgressSpinnerModule,
    SelectButtonModule,
    TagModule,
  ],
  templateUrl: './club-search.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ClubSearchService]
})
export class ClubSearchComponent {
  readonly searchInput = viewChild.required<ElementRef>('searchInput');

  private readonly clubService = new ClubSearchService();
  private readonly router = Router;

  // Component state
  showAdvancedFilters = signal(false);

  // Service selectors
  clubs = this.clubService.clubs;
  totalCount = this.clubService.totalCount;
  clubStats = this.clubService.clubStats;
  aggregations = this.clubService.aggregations;
  autocompleteOptions = this.clubService.autocompleteOptions;
  error = this.clubService.error;
  loading = this.clubService.loading;
  autocompleteLoading = this.clubService.autocompleteLoading;
  pagination = this.clubService.pagination;
  sortBy = this.clubService.sortBy;
  viewMode = this.clubService.viewMode;

  // Form controls
  autocompleteQuery = this.clubService.autocompleteQuery;
  selectedClub = this.clubService.filter.get('selectedClub') as FormControl<ClubAutoCompleteItem | null>;
  state = this.clubService.filter.get('state') as FormControl<string | null>;
  country = this.clubService.filter.get('country') as FormControl<string | null>;
  division = this.clubService.filter.get('division') as FormControl<string | null>;
  minPlayers = this.clubService.filter.get('minPlayers') as FormControl<number | null>;
  maxPlayers = this.clubService.filter.get('maxPlayers') as FormControl<number | null>;
  minTeams = this.clubService.filter.get('minTeams') as FormControl<number | null>;
  maxTeams = this.clubService.filter.get('maxTeams') as FormControl<number | null>;
  isActive = this.clubService.filter.get('isActive') as FormControl<boolean | null>;
  hasWebsite = this.clubService.filter.get('hasWebsite') as FormControl<boolean | null>;
  foundedAfter = this.clubService.filter.get('foundedAfter') as FormControl<number | null>;
  foundedBefore = this.clubService.filter.get('foundedBefore') as FormControl<number | null>;

  // Options from service
  stateOptions = this.clubService.stateOptions;
  countryOptions = this.clubService.countryOptions;
  divisionOptions = this.clubService.divisionOptions;
  sortOptions = this.clubService.sortOptions;
  viewModeOptions = this.clubService.viewModeOptions;
  pageSizeOptions = this.clubService.pageSizeOptions;

  // Utility methods from service
  getClubDisplayName = this.clubService.getClubDisplayName.bind(this.clubService);
  getClubLocation = this.clubService.getClubLocation.bind(this.clubService);
  getClubStatusBadge = this.clubService.getClubStatusBadge.bind(this.clubService);
  getPlayersCountLabel = this.clubService.getPlayersCountLabel.bind(this.clubService);
  getTeamsCountLabel = this.clubService.getTeamsCountLabel.bind(this.clubService);

  // Event handlers
  onClubSelect(club: ClubAutoCompleteItem): void {
    this.selectedClub.setValue(club);
    this.autocompleteQuery.setValue(club.name);
  }

  onSearchClear(): void {
    this.selectedClub.setValue(null);
    this.autocompleteQuery.setValue('');
  }

  onPageChange(event: any): void {
    this.clubService.onPageChange(event);
    this.scrollToTop();
  }

  onSortChange(sortOption: SortOption): void {
    this.clubService.onSortChange(sortOption);
  }

  onViewModeChange(viewMode: ViewMode): void {
    this.clubService.onViewModeChange(viewMode);
  }

  onPageSizeChange(pageSize: number): void {
    this.clubService.onPageSizeChange(pageSize);
    this.scrollToTop();
  }

  clearFilters(): void {
    this.clubService.clearFilters();
    this.autocompleteQuery.setValue('');
    this.showAdvancedFilters.set(false);
    this.scrollToTop();
  }

  applyFilters(): void {
    // Filters are applied automatically through reactive forms
    // This method can be used for additional logic if needed
    this.scrollToTop();
  }

  focusSearch(): void {
    const searchInput = this.searchInput();
    if (searchInput?.nativeElement) {
      searchInput.nativeElement.focus();
    }
  }

  clearError(): void {
    // In a real implementation, you might want to add an error clearing method to the service
    console.log('Clear error clicked');
  }

  // Navigation method
  navigateToClub(club: ClubWithStats): void {
    if (club.slug) {
      this.router.navigate(['/clubs', club.slug]);
    }
  }

  // Utility methods for template
  Math = Math;

  trackByClubId = (index: number, club: ClubWithStats): string => club.id;

  isGridView(): boolean {
    return this.viewMode().value === 'grid';
  }

  isListView(): boolean {
    return this.viewMode().value === 'list';
  }

  hasActiveFilters(): boolean {
    const filterValues = this.clubService.filter.value;
    return Object.entries(filterValues).some(([key, value]) => {
      if (key === 'query' || key === 'selectedClub') return false; // These are search, not filters
      return value !== null && value !== undefined && value !== '';
    });
  }

  getActiveFiltersCount(): number {
    const filterValues = this.clubService.filter.value;
    return Object.entries(filterValues).filter(([key, value]) => {
      if (key === 'query' || key === 'selectedClub') return false;
      return value !== null && value !== undefined && value !== '';
    }).length;
  }

  // Performance optimization methods
  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Additional helper methods for complex UI interactions
  toggleAdvancedFilters(): void {
    this.showAdvancedFilters.update(show => !show);
  }

  resetPagination(): void {
    this.clubService.pagination.update(p => ({ 
      ...p, 
      first: 0, 
      page: 0 
    }));
  }

  exportClubs(): void {
    // Method for future implementation of export functionality
    console.log('Export clubs functionality - to be implemented');
  }

  shareSearch(): void {
    // Method for future implementation of sharing search results
    console.log('Share search functionality - to be implemented');
  }

  saveSearch(): void {
    // Method for future implementation of saving searches
    console.log('Save search functionality - to be implemented');
  }

  // Responsive helper methods
  isMobile(): boolean {
    return window.innerWidth < 768;
  }

  isTablet(): boolean {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  }

  isDesktop(): boolean {
    return window.innerWidth >= 1024;
  }

  // Analytics helper methods (for future implementation)
  trackSearchEvent(query: string): void {
    console.log('Search tracked:', query);
  }

  trackFilterEvent(filterType: string, value: any): void {
    console.log('Filter tracked:', filterType, value);
  }

  trackClubClick(club: ClubWithStats): void {
    console.log('Club click tracked:', club.name);
  }
}