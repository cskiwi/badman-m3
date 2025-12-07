import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Club } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators';
import { lastValueFrom, of } from 'rxjs';

export interface ClubWithStats extends Club {
  playersCount?: number;
  teamsCount?: number;
  foundedYear?: number;
  division?: string;
  website?: string;
  email?: string;
  phone?: string;
  description?: string;
  isActive?: boolean;
  lastActivity?: Date;
}

export interface ClubsQueryResponse {
  clubs: ClubWithStats[];
  totalCount: number;
  aggregations?: {
    states: { name: string; count: number }[];
    countries: { name: string; count: number }[];
    divisions: { name: string; count: number }[];
  };
}

export interface ClubAutoCompleteItem {
  id: string;
  name: string;
  fullName?: string;
  abbreviation?: string;
  state?: string;
  country?: string;
}

export interface PaginationState {
  first: number;
  rows: number;
  page: number;
  pageCount: number;
}

export interface SortOption {
  label: string;
  value: string;
  field: string;
  order: 'ASC' | 'DESC';
}

export interface ViewMode {
  label: string;
  value: 'grid' | 'list';
  icon: string;
}

export class ClubSearchService {
  private readonly apollo = inject(Apollo);

  // Form controls for filters
  filter = new FormGroup({
    query: new FormControl<string | null>(null),
    selectedClub: new FormControl<ClubAutoCompleteItem | null>(null),
    state: new FormControl<string | null>(null),
    country: new FormControl<string | null>(null),
    division: new FormControl<string | null>(null),
    minPlayers: new FormControl<number | null>(null),
    maxPlayers: new FormControl<number | null>(null),
    minTeams: new FormControl<number | null>(null),
    maxTeams: new FormControl<number | null>(null),
    isActive: new FormControl<boolean | null>(null),
    hasWebsite: new FormControl<boolean | null>(null),
    foundedAfter: new FormControl<number | null>(null),
    foundedBefore: new FormControl<number | null>(null)
  });

  // Pagination and view controls
  pagination = signal<PaginationState>({
    first: 0,
    rows: 12,
    page: 0,
    pageCount: 0
  });

  sortBy = signal<SortOption>({
    label: 'Name A-Z',
    value: 'name-asc',
    field: 'name',
    order: 'ASC'
  });

  viewMode = signal<ViewMode>({
    label: 'Grid View',
    value: 'grid',
    icon: 'pi pi-th-large'
  });

  // Autocomplete query
  autocompleteQuery = new FormControl<string>('');

  // Convert form to signal for resource with debounce
  private filterSignal = toSignal(
    this.filter.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    )
  );

  private paginationSignal = computed(() => this.pagination());
  private sortSignal = computed(() => this.sortBy());

  // Autocomplete resource
  private autocompleteResource = resource({
    params: toSignal(
      this.autocompleteQuery.valueChanges.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        filter(query => (query?.length ?? 0) >= 2)
      )
    ),
    loader: async ({ params }) => {
      if (!params || params.length < 2) return [];

      try {
        const result = await lastValueFrom(this.apollo
          .query<{ clubsAutocomplete: ClubAutoCompleteItem[] }>({
            query: gql`
              query ClubsAutocomplete($query: String!) {
                clubsAutocomplete(query: $query) {
                  id
                  name
                  fullName
                  abbreviation
                  state
                  country
                }
              }
            `,
            variables: { query: params },
          }));

        return result?.data.clubsAutocomplete ?? [];
      } catch (err) {
        console.error('Autocomplete error:', err);
        return [];
      }
    },
  });

  // Main clubs resource
  private clubsResource = resource({
    params: computed(() => ({
      filters: this.filterSignal(),
      pagination: this.paginationSignal(),
      sort: this.sortSignal()
    })),
    loader: async ({ params, abortSignal }) => {
      try {
        const result = await lastValueFrom(this.apollo
          .query<ClubsQueryResponse>({
            query: gql`
              query Clubs($args: ClubArgs, $pagination: PaginationArgs, $sort: [OrderByClause!]) {
                clubs(args: $args, pagination: $pagination, orderBy: $sort) {
                  id
                  name
                  fullName
                  abbreviation
                  slug
                  state
                  country
                  teamName
                  contactCompetition
                  foundedYear
                  division
                  website
                  email
                  phone
                  description
                  isActive
                  lastActivity
                  clubPlayerMemberships {
                    id
                    player {
                      id
                    }
                  }
                  teams {
                    id
                    name
                  }
                }
                clubsCount(args: $args)
                clubsAggregations(args: $args) {
                  states {
                    name
                    count
                  }
                  countries {
                    name
                    count
                  }
                  divisions {
                    name
                    count
                  }
                }
              }
            `,
            variables: {
              args: { 
                where: this._buildWhereClause(params?.filters),
              },
              pagination: {
                skip: params?.pagination.first || 0,
                take: params?.pagination.rows || 12
              },
              sort: this._buildSortClause(params?.sort)
            },
            context: { signal: abortSignal },
          }));

        if (!result?.data) {
          throw new Error('No data received');
        }

        const clubs: ClubWithStats[] = (result.data.clubs || []).map(club => ({
          ...club,
          playersCount: club.clubPlayerMemberships?.length || 0,
          teamsCount: club.teams?.length || 0
        }));

        // Update pagination
        const totalCount = result.data.clubsCount || 0;
        const currentPagination = this.pagination();
        this.pagination.set({
          ...currentPagination,
          pageCount: Math.ceil(totalCount / currentPagination.rows)
        });

        return {
          clubs,
          totalCount,
          aggregations: result.data.clubsAggregations
        };
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  clubs = computed(() => this.clubsResource.value()?.clubs ?? []);
  totalCount = computed(() => this.clubsResource.value()?.totalCount ?? 0);
  aggregations = computed(() => this.clubsResource.value()?.aggregations);
  autocompleteOptions = computed(() => this.autocompleteResource.value() ?? []);
  
  error = computed(() => this.clubsResource.error()?.message || null);
  loading = computed(() => this.clubsResource.isLoading());
  autocompleteLoading = computed(() => this.autocompleteResource.isLoading());

  // Statistics
  clubStats = computed(() => {
    const clubs = this.clubs();
    return {
      totalClubs: this.totalCount(),
      currentPageClubs: clubs.length,
      totalPlayers: clubs.reduce((sum, club) => sum + (club.playersCount || 0), 0),
      totalTeams: clubs.reduce((sum, club) => sum + (club.teamsCount || 0), 0),
      averagePlayersPerClub: clubs.length > 0 ? 
        Math.round(clubs.reduce((sum, club) => sum + (club.playersCount || 0), 0) / clubs.length) : 0,
      activeClubs: clubs.filter(club => club.isActive).length
    };
  });

  // Available options from aggregations
  stateOptions = computed(() => {
    const agg = this.aggregations();
    const base = [{ label: 'All States', value: null }];
    if (agg?.states) {
      base.push(...agg.states.map(s => ({ label: `${s.name} (${s.count})`, value: s.name })));
    }
    return base;
  });

  countryOptions = computed(() => {
    const agg = this.aggregations();
    const base = [{ label: 'All Countries', value: null }];
    if (agg?.countries) {
      base.push(...agg.countries.map(c => ({ label: `${c.name} (${c.count})`, value: c.name })));
    }
    return base;
  });

  divisionOptions = computed(() => {
    const agg = this.aggregations();
    const base = [{ label: 'All Divisions', value: null }];
    if (agg?.divisions) {
      base.push(...agg.divisions.map(d => ({ label: `${d.name} (${d.count})`, value: d.name })));
    }
    return base;
  });

  // Sort options
  sortOptions: SortOption[] = [
    { label: 'Name A-Z', value: 'name-asc', field: 'name', order: 'ASC' },
    { label: 'Name Z-A', value: 'name-desc', field: 'name', order: 'DESC' },
    { label: 'Most Players', value: 'players-desc', field: 'playersCount', order: 'DESC' },
    { label: 'Least Players', value: 'players-asc', field: 'playersCount', order: 'ASC' },
    { label: 'Most Teams', value: 'teams-desc', field: 'teamsCount', order: 'DESC' },
    { label: 'Least Teams', value: 'teams-asc', field: 'teamsCount', order: 'ASC' },
    { label: 'Recently Founded', value: 'founded-desc', field: 'foundedYear', order: 'DESC' },
    { label: 'Oldest First', value: 'founded-asc', field: 'foundedYear', order: 'ASC' },
    { label: 'Last Activity', value: 'activity-desc', field: 'lastActivity', order: 'DESC' }
  ];

  // View mode options
  viewModeOptions: ViewMode[] = [
    { label: 'Grid View', value: 'grid', icon: 'pi pi-th-large' },
    { label: 'List View', value: 'list', icon: 'pi pi-list' }
  ];

  // Page size options
  pageSizeOptions = [
    { label: '12 per page', value: 12 },
    { label: '24 per page', value: 24 },
    { label: '48 per page', value: 48 },
    { label: '96 per page', value: 96 }
  ];

  // Methods
  clearFilters(): void {
    this.filter.reset();
    this.pagination.set({
      first: 0,
      rows: 12,
      page: 0,
      pageCount: 0
    });
  }

  onPageChange(event: any): void {
    this.pagination.set({
      first: event.first,
      rows: event.rows,
      page: event.page,
      pageCount: event.pageCount
    });
  }

  onSortChange(sortOption: SortOption): void {
    this.sortBy.set(sortOption);
    // Reset to first page when sorting changes
    this.pagination.update(p => ({ ...p, first: 0, page: 0 }));
  }

  onViewModeChange(viewMode: ViewMode): void {
    this.viewMode.set(viewMode);
  }

  onPageSizeChange(pageSize: number): void {
    this.pagination.update(p => ({
      ...p,
      rows: pageSize,
      first: 0,
      page: 0,
      pageCount: Math.ceil(this.totalCount() / pageSize)
    }));
  }

  // Utility methods
  getClubDisplayName(club: ClubWithStats): string {
    return club.fullName || club.name;
  }

  getClubLocation(club: ClubWithStats): string {
    if (club.state && club.country) {
      return `${club.state}, ${club.country}`;
    }
    return club.state || club.country || 'Location not specified';
  }

  getClubStatusBadge(club: ClubWithStats): { severity: string; label: string } {
    if (club.isActive) {
      return { severity: 'success', label: 'Active' };
    }
    return { severity: 'warning', label: 'Inactive' };
  }

  getPlayersCountLabel(club: ClubWithStats): string {
    const count = club.playersCount || 0;
    return count === 1 ? '1 player' : `${count} players`;
  }

  getTeamsCountLabel(club: ClubWithStats): string {
    const count = club.teamsCount || 0;
    return count === 1 ? '1 team' : `${count} teams`;
  }

  // Private methods
  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404) {
      return 'Failed to load clubs';
    }
    if (err.status === 500) {
      return 'Server error occurred';
    }
    return err.statusText || 'An error occurred while loading clubs';
  }

  private _buildWhereClause(params: any) {
    if (!params) return undefined;

    const where: any = {};

    // Text search
    if (params.query && !params.selectedClub) {
      const searchTerms = this._parseSearchQuery(params.query);
      if (searchTerms.length > 0) {
        where.OR = [
          ...searchTerms.map(term => ({ name: { ilike: `%${term}%` } })),
          ...searchTerms.map(term => ({ fullName: { ilike: `%${term}%` } })),
          ...searchTerms.map(term => ({ abbreviation: { ilike: `%${term}%` } })),
        ];
      }
    }

    // Selected club from autocomplete
    if (params.selectedClub?.id) {
      where.id = { eq: params.selectedClub.id };
    }

    // Location filters
    if (params.state) {
      where.state = { eq: params.state };
    }
    if (params.country) {
      where.country = { eq: params.country };
    }
    if (params.division) {
      where.division = { eq: params.division };
    }

    // Numeric filters
    if (params.minPlayers) {
      where.playersCount = { ...where.playersCount, gte: params.minPlayers };
    }
    if (params.maxPlayers) {
      where.playersCount = { ...where.playersCount, lte: params.maxPlayers };
    }
    if (params.minTeams) {
      where.teamsCount = { ...where.teamsCount, gte: params.minTeams };
    }
    if (params.maxTeams) {
      where.teamsCount = { ...where.teamsCount, lte: params.maxTeams };
    }

    // Date filters
    if (params.foundedAfter) {
      where.foundedYear = { ...where.foundedYear, gte: params.foundedAfter };
    }
    if (params.foundedBefore) {
      where.foundedYear = { ...where.foundedYear, lte: params.foundedBefore };
    }

    // Boolean filters
    if (params.isActive !== null && params.isActive !== undefined) {
      where.isActive = { eq: params.isActive };
    }
    if (params.hasWebsite !== null && params.hasWebsite !== undefined) {
      if (params.hasWebsite) {
        where.website = { isNotNull: true };
      } else {
        where.website = { isNull: true };
      }
    }

    return Object.keys(where).length > 0 ? where : undefined;
  }

  private _buildSortClause(sortOption?: SortOption) {
    if (!sortOption) return [{ name: 'ASC' }];

    return [{ [sortOption.field]: sortOption.order }];
  }

  private _parseSearchQuery(query: string | null | undefined): string[] {
    if (!query) return [];

    return query
      .toLowerCase()
      .replace(/[;\\/:*?"<>|&',]/g, ' ')
      .split(' ')
      .map(part => part.trim())
      .filter(part => part.length > 0);
  }
}