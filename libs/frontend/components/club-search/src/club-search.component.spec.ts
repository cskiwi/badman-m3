import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';

import { ClubSearchComponent } from './club-search.component';
import { ClubSearchService } from './club-search.service';

// Mock data
const mockClubs = [
  {
    id: '1',
    name: 'Test Club 1',
    fullName: 'Test Badminton Club 1',
    slug: 'test-club-1',
    state: 'Test State',
    country: 'Test Country',
    playersCount: 25,
    teamsCount: 3,
    isActive: true,
    foundedYear: 2010,
    division: 'Division 1',
    website: 'https://testclub1.com',
    clubId: 101
  },
  {
    id: '2',
    name: 'Test Club 2',
    fullName: 'Test Badminton Club 2',
    slug: 'test-club-2',
    state: 'Another State',
    country: 'Test Country',
    playersCount: 15,
    teamsCount: 2,
    isActive: false,
    foundedYear: 2015,
    division: 'Division 2',
    clubId: 102
  }
];

const mockAggregations = {
  states: [
    { name: 'Test State', count: 1 },
    { name: 'Another State', count: 1 }
  ],
  countries: [
    { name: 'Test Country', count: 2 }
  ],
  divisions: [
    { name: 'Division 1', count: 1 },
    { name: 'Division 2', count: 1 }
  ]
};

// Mock services
const mockApollo = {
  query: jest.fn().mockReturnValue(of({
    data: {
      clubs: mockClubs,
      clubsCount: 2,
      clubsAggregations: mockAggregations
    }
  }))
};

const mockRouter = {
  navigate: jest.fn()
};

describe('ClubSearchComponent', () => {
  let component: ClubSearchComponent;
  let fixture: ComponentFixture<ClubSearchComponent>;
  let clubService: ClubSearchService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ClubSearchComponent,
        ReactiveFormsModule,
        NoopAnimationsModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: Apollo, useValue: mockApollo },
        { provide: Router, useValue: mockRouter },
        ClubSearchService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClubSearchComponent);
    component = fixture.componentInstance;
    clubService = TestBed.inject(ClubSearchService);
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.viewMode().value).toBe('grid');
    expect(component.pagination().rows).toBe(12);
    expect(component.pagination().first).toBe(0);
    expect(component.showAdvancedFilters()).toBe(false);
  });

  it('should handle club selection from autocomplete', () => {
    const mockClub = {
      id: '1',
      name: 'Test Club',
      fullName: 'Test Full Name',
      state: 'Test State',
      country: 'Test Country'
    };

    component.onClubSelect(mockClub);
    
    expect(component.selectedClub.value).toEqual(mockClub);
    expect(component.autocompleteQuery.value).toBe(mockClub.name);
  });

  it('should clear search when onSearchClear is called', () => {
    // Set some values first
    component.selectedClub.setValue({
      id: '1',
      name: 'Test Club',
      state: 'Test State',
      country: 'Test Country'
    });
    component.autocompleteQuery.setValue('Test Club');

    component.onSearchClear();

    expect(component.selectedClub.value).toBeNull();
    expect(component.autocompleteQuery.value).toBe('');
  });

  it('should toggle advanced filters', () => {
    expect(component.showAdvancedFilters()).toBe(false);
    
    component.toggleAdvancedFilters();
    expect(component.showAdvancedFilters()).toBe(true);
    
    component.toggleAdvancedFilters();
    expect(component.showAdvancedFilters()).toBe(false);
  });

  it('should handle sort changes', () => {
    const sortOption = {
      label: 'Most Players',
      value: 'players-desc',
      field: 'playersCount',
      order: 'DESC' as const
    };

    component.onSortChange(sortOption);
    
    expect(component.sortBy()).toEqual(sortOption);
  });

  it('should handle view mode changes', () => {
    const listViewMode = {
      label: 'List View',
      value: 'list' as const,
      icon: 'pi pi-list'
    };

    component.onViewModeChange(listViewMode);
    
    expect(component.viewMode()).toEqual(listViewMode);
  });

  it('should handle page size changes', () => {
    const newPageSize = 24;
    
    component.onPageSizeChange(newPageSize);
    
    expect(component.pagination().rows).toBe(newPageSize);
    expect(component.pagination().first).toBe(0);
    expect(component.pagination().page).toBe(0);
  });

  it('should clear all filters when clearFilters is called', () => {
    // Set some filter values
    component.state.setValue('Test State');
    component.country.setValue('Test Country');
    component.minPlayers.setValue(10);
    component.showAdvancedFilters.set(true);
    
    component.clearFilters();
    
    expect(component.state.value).toBeNull();
    expect(component.country.value).toBeNull();
    expect(component.minPlayers.value).toBeNull();
    expect(component.autocompleteQuery.value).toBe('');
    expect(component.showAdvancedFilters()).toBe(false);
  });

  it('should identify view modes correctly', () => {
    // Test grid view (default)
    expect(component.isGridView()).toBe(true);
    expect(component.isListView()).toBe(false);
    
    // Switch to list view
    const listViewMode = {
      label: 'List View',
      value: 'list' as const,
      icon: 'pi pi-list'
    };
    component.onViewModeChange(listViewMode);
    
    expect(component.isGridView()).toBe(false);
    expect(component.isListView()).toBe(true);
  });

  it('should detect active filters correctly', () => {
    expect(component.hasActiveFilters()).toBe(false);
    expect(component.getActiveFiltersCount()).toBe(0);
    
    // Set some filters (excluding search fields)
    component.state.setValue('Test State');
    component.minPlayers.setValue(10);
    
    expect(component.hasActiveFilters()).toBe(true);
    expect(component.getActiveFiltersCount()).toBe(2);
  });

  it('should get club display name correctly', () => {
    const clubWithFullName = mockClubs[0];
    const clubWithoutFullName = { ...mockClubs[0], fullName: undefined };
    
    expect(component.getClubDisplayName(clubWithFullName)).toBe('Test Badminton Club 1');
    expect(component.getClubDisplayName(clubWithoutFullName)).toBe('Test Club 1');
  });

  it('should format club location correctly', () => {
    const clubWithBoth = mockClubs[0];
    const clubWithStateOnly = { ...mockClubs[0], country: undefined };
    const clubWithCountryOnly = { ...mockClubs[0], state: undefined };
    const clubWithNeither = { ...mockClubs[0], state: undefined, country: undefined };
    
    expect(component.getClubLocation(clubWithBoth)).toBe('Test State, Test Country');
    expect(component.getClubLocation(clubWithStateOnly)).toBe('Test State');
    expect(component.getClubLocation(clubWithCountryOnly)).toBe('Test Country');
    expect(component.getClubLocation(clubWithNeither)).toBe('Location not specified');
  });

  it('should get correct status badge', () => {
    const activeClub = mockClubs[0];
    const inactiveClub = mockClubs[1];
    
    expect(component.getClubStatusBadge(activeClub)).toEqual({
      severity: 'success',
      label: 'Active'
    });
    expect(component.getClubStatusBadge(inactiveClub)).toEqual({
      severity: 'warning',
      label: 'Inactive'
    });
  });

  it('should format player count labels correctly', () => {
    const singlePlayerClub = { ...mockClubs[0], playersCount: 1 };
    const multiplePlayerClub = mockClubs[0];
    const noPlayerClub = { ...mockClubs[0], playersCount: 0 };
    
    expect(component.getPlayersCountLabel(singlePlayerClub)).toBe('1 player');
    expect(component.getPlayersCountLabel(multiplePlayerClub)).toBe('25 players');
    expect(component.getPlayersCountLabel(noPlayerClub)).toBe('0 players');
  });

  it('should format team count labels correctly', () => {
    const singleTeamClub = { ...mockClubs[0], teamsCount: 1 };
    const multipleTeamClub = mockClubs[0];
    const noTeamClub = { ...mockClubs[0], teamsCount: 0 };
    
    expect(component.getTeamsCountLabel(singleTeamClub)).toBe('1 team');
    expect(component.getTeamsCountLabel(multipleTeamClub)).toBe('3 teams');
    expect(component.getTeamsCountLabel(noTeamClub)).toBe('0 teams');
  });

  it('should track clubs by ID', () => {
    const club = mockClubs[0];
    const result = component.trackByClubId(0, club);
    expect(result).toBe(club.id);
  });

  // Integration tests would require more complex setup
  // These are just unit tests for the component logic
  
  it('should handle responsive breakpoints', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });
    
    expect(component.isMobile()).toBe(true);
    expect(component.isTablet()).toBe(false);
    expect(component.isDesktop()).toBe(false);
    
    (window as any).innerWidth = 800;
    expect(component.isMobile()).toBe(false);
    expect(component.isTablet()).toBe(true);
    expect(component.isDesktop()).toBe(false);
    
    (window as any).innerWidth = 1200;
    expect(component.isMobile()).toBe(false);
    expect(component.isTablet()).toBe(false);
    expect(component.isDesktop()).toBe(true);
  });
});