import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { OverviewService } from './page-overview.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DataViewModule } from 'primeng/dataview';
import { PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { RatingModule } from 'primeng/rating';
import { SkeletonModule } from 'primeng/skeleton';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-overview',
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    InputTextModule,
    ProgressBarModule,
    CardModule,
    ButtonModule,
    AutoCompleteModule,
    DataViewModule,
    PaginatorModule,
    SelectModule,
    ToggleSwitchModule,
    TagModule,
    RatingModule,
    SkeletonModule,
    BadgeModule,
    DividerModule,
    PageHeaderComponent,
  ],
  templateUrl: './page-overview.component.html',
  styleUrl: './page-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageOverviewComponent {
  readonly dataService = new OverviewService();

  // selectors
  players = this.dataService.players;
  paginatedPlayers = this.dataService.paginatedPlayers;
  totalPlayers = this.dataService.totalPlayers;
  suggestions = this.dataService.suggestions;

  error = this.dataService.error;
  loading = this.dataService.loading;

  // Form controls
  searchQuery = this.dataService.filter.get('searchQuery') as FormControl;
  sortBy = this.dataService.filter.get('sortBy') as FormControl;
  sortOrder = this.dataService.filter.get('sortOrder') as FormControl;
  pageSize = this.dataService.filter.get('pageSize') as FormControl;
  currentPage = this.dataService.filter.get('currentPage') as FormControl;
  minAge = this.dataService.filter.get('minAge') as FormControl;
  maxAge = this.dataService.filter.get('maxAge') as FormControl;
  club = this.dataService.filter.get('club') as FormControl;
  showOnlyActive = this.dataService.filter.get('showOnlyActive') as FormControl;

  // Options for dropdowns
  sortOptions = [
    { label: 'Name', value: 'fullName' },
    { label: 'Member ID', value: 'memberId' },
    { label: 'Age', value: 'age' },
    { label: 'Ranking', value: 'ranking' },
    { label: 'Club', value: 'club' },
  ];

  sortOrderOptions = [
    { label: 'Ascending', value: 'asc' },
    { label: 'Descending', value: 'desc' },
  ];

  pageSizeOptions = [
    { label: '10', value: 10 },
    { label: '25', value: 25 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
  ];

  // Layout options
  layout: 'grid' | 'list' = 'grid';

  // Computed properties
  hasFilters = computed(() => {
    const filter = this.dataService.filter.value;
    return !!(filter.minAge || filter.maxAge || filter.club || filter.showOnlyActive);
  });

  // Methods
  onSearch(event: any) {
    this.dataService.getSuggestions(event.query);
  }

  onPageChange(event: any) {
    this.currentPage.setValue(event.page);
    this.pageSize.setValue(event.rows);
  }

  toggleLayout() {
    this.layout = this.layout === 'grid' ? 'list' : 'grid';
  }

  clearFilters() {
    this.dataService.clearFilters();
  }

  getRankingColor(ranking: number): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    if (ranking <= 100) return 'success';
    if (ranking <= 500) return 'info';
    if (ranking <= 1000) return 'warn';
    return 'secondary';
  }

  getAgeGroup(age: number): string {
    if (age < 18) return 'Youth';
    if (age < 35) return 'Adult';
    if (age < 50) return 'Veteran';
    return 'Senior';
  }

  getPlayerAge(player: any): number | null {
    if (!player.birthDate) return null;
    const today = new Date();
    const birthDate = new Date(player.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  getPlayerClub(player: any): any | null {
    if (!player.clubPlayerMemberships?.length) return null;
    // Get the most recent active membership
    const activeMembership = player.clubPlayerMemberships
      .filter((m: any) => !m.end || new Date(m.end) > new Date())
      .sort((a: any, b: any) => new Date(b.start).getTime() - new Date(a.start).getTime())[0];
    return activeMembership?.club || null;
  }

  getPlayerRanking(player: any): number | null {
    // This would need to be calculated based on ranking data
    // For now, return a placeholder
    return Math.floor(Math.random() * 1000) + 1;
  }

  isPlayerActive(player: any): boolean {
    return player.competitionPlayer === true;
  }
}
