/**
 * Test utilities for comprehensive testing of tournament player and club search pages
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { signal } from '@angular/core';

// Mock data generators
export class MockDataGenerator {
  static generatePlayer(overrides: Partial<any> = {}) {
    return {
      id: `player-${Math.random().toString(36).substr(2, 9)}`,
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      gender: 'male',
      birthDate: '1990-01-15',
      competitivePlayerIndex: 1250,
      phone: '+1234567890',
      email: 'john.doe@example.com',
      slug: 'john-doe',
      ...overrides
    };
  }

  static generateClub(overrides: Partial<any> = {}) {
    return {
      id: `club-${Math.random().toString(36).substr(2, 9)}`,
      name: 'Test Club',
      fullName: 'Test Badminton Club',
      slug: 'test-club',
      state: 'TestState',
      country: 'TestCountry',
      division: 'Division 1',
      playerCount: 25,
      teamCount: 5,
      isActive: true,
      hasWebsite: true,
      foundedYear: 2010,
      email: 'info@testclub.com',
      phone: '+9876543210',
      website: 'https://testclub.com',
      ...overrides
    };
  }

  static generatePlayerStats(overrides: Partial<any> = {}) {
    return {
      totalGames: 150,
      gamesWon: 95,
      gamesLost: 55,
      winRate: 63.33,
      tournaments: 12,
      averagePosition: 4.2,
      bestPosition: 1,
      currentStreak: 3,
      lastGameDate: new Date().toISOString(),
      ...overrides
    };
  }

  static generateClubStats(overrides: Partial<any> = {}) {
    return {
      totalTeams: 8,
      totalPlayers: 45,
      activeTeams: 6,
      activePlayers: 38,
      totalTournaments: 25,
      gamesWon: 450,
      gamesLost: 320,
      winRate: 58.44,
      averagePosition: 3.8,
      ...overrides
    };
  }

  static generateTournamentEntry(overrides: Partial<any> = {}) {
    return {
      id: `entry-${Math.random().toString(36).substr(2, 9)}`,
      tournament: {
        name: 'Test Tournament',
        eventType: 'MD',
        level: 'Regional',
        startDate: new Date().toISOString(),
      },
      team: {
        name: 'Test Team',
        type: 'Men Doubles'
      },
      standing: {
        position: Math.floor(Math.random() * 10) + 1,
        points: Math.floor(Math.random() * 100) + 50
      },
      ...overrides
    };
  }

  static generatePaginatedResponse<T>(items: T[], page = 0, pageSize = 10) {
    const start = page * pageSize;
    const end = start + pageSize;
    return {
      data: items.slice(start, end),
      total: items.length,
      page,
      pageSize,
      totalPages: Math.ceil(items.length / pageSize)
    };
  }
}

// Component test setup utility
export class ComponentTestSetup {
  static async setupComponent<T>(
    componentClass: any,
    additionalImports: any[] = [],
    providers: any[] = []
  ): Promise<ComponentFixture<T>> {
    await TestBed.configureTestingModule({
      imports: [
        componentClass,
        NoopAnimationsModule,
        RouterTestingModule,
        HttpClientTestingModule,
        TranslateModule.forRoot(),
        ...additionalImports
      ],
      providers: [
        TranslateService,
        ...providers
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(componentClass);
    fixture.detectChanges();
    return fixture;
  }
}

// Mock services
export class MockClubSearchService {
  clubs = signal([]);
  totalCount = signal(0);
  clubStats = signal({});
  aggregations = signal({});
  autocompleteOptions = signal([]);
  error = signal(null);
  loading = signal(false);
  autocompleteLoading = signal(false);
  pagination = signal({ first: 0, rows: 10, page: 0 });
  sortBy = signal({ field: 'name', order: 1 });
  viewMode = signal({ value: 'grid' });

  filter = {
    get: jasmine.createSpy('get').and.returnValue({
      setValue: jasmine.createSpy('setValue'),
      value: null
    }),
    value: {}
  };

  autocompleteQuery = {
    setValue: jasmine.createSpy('setValue')
  };

  onPageChange = jasmine.createSpy('onPageChange');
  onSortChange = jasmine.createSpy('onSortChange');
  onViewModeChange = jasmine.createSpy('onViewModeChange');
  onPageSizeChange = jasmine.createSpy('onPageSizeChange');
  clearFilters = jasmine.createSpy('clearFilters');

  stateOptions = signal([]);
  countryOptions = signal([]);
  divisionOptions = signal([]);
  sortOptions = signal([]);
  viewModeOptions = signal([]);
  pageSizeOptions = signal([]);

  getClubDisplayName = jasmine.createSpy('getClubDisplayName').and.returnValue('Test Club');
  getClubLocation = jasmine.createSpy('getClubLocation').and.returnValue('Test Location');
  getClubStatusBadge = jasmine.createSpy('getClubStatusBadge').and.returnValue({ label: 'Active', severity: 'success' });
  getPlayersCountLabel = jasmine.createSpy('getPlayersCountLabel').and.returnValue('25 players');
  getTeamsCountLabel = jasmine.createSpy('getTeamsCountLabel').and.returnValue('5 teams');
}

export class MockPlayerDetailService {
  player = signal(null);
  statistics = signal(null);
  tournamentHistory = signal([]);
  recentGames = signal([]);
  allGames = signal([]);
  error = signal(null);
  loading = signal(false);

  filter = {
    get: jasmine.createSpy('get').and.returnValue({
      setValue: jasmine.createSpy('setValue')
    })
  };
}

export class MockClubDetailService {
  club = signal(null);
  teams = signal([]);
  playerRoster = signal([]);
  tournamentEntries = signal([]);
  statistics = signal(null);
  error = signal(null);
  loading = signal(false);
  currentSeason = signal(2024);
  availableSeasons = signal([2024, 2023, 2022]);

  filter = {
    get: jasmine.createSpy('get').and.returnValue({
      setValue: jasmine.createSpy('setValue')
    })
  };
}

// Performance testing utilities
export class PerformanceTestUtils {
  static measurePageLoad(testName: string): Promise<number> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      setTimeout(() => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        console.log(`${testName} load time: ${loadTime.toFixed(2)}ms`);
        resolve(loadTime);
      }, 0);
    });
  }

  static measureSearchResponse(searchFunction: () => Promise<any>): Promise<number> {
    return new Promise(async (resolve) => {
      const startTime = performance.now();
      await searchFunction();
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      console.log(`Search response time: ${responseTime.toFixed(2)}ms`);
      resolve(responseTime);
    });
  }

  static checkMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
}

// Accessibility testing utilities
export class AccessibilityTestUtils {
  static checkKeyboardNavigation(element: HTMLElement): boolean {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    return focusableElements.length > 0 && 
           Array.from(focusableElements).every(el => 
             !el.hasAttribute('tabindex') || 
             parseInt(el.getAttribute('tabindex') || '0') >= 0
           );
  }

  static checkAriaLabels(element: HTMLElement): boolean {
    const interactiveElements = element.querySelectorAll(
      'button, [role="button"], input, select, textarea'
    );
    
    return Array.from(interactiveElements).every(el => 
      el.hasAttribute('aria-label') || 
      el.hasAttribute('aria-labelledby') ||
      el.textContent?.trim().length > 0
    );
  }

  static checkHeadingStructure(element: HTMLElement): boolean {
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) return true;

    let previousLevel = 0;
    for (const heading of Array.from(headings)) {
      const currentLevel = parseInt(heading.tagName.charAt(1));
      if (previousLevel > 0 && currentLevel > previousLevel + 1) {
        return false; // Skipped heading level
      }
      previousLevel = currentLevel;
    }
    return true;
  }
}

// Network simulation utilities
export class NetworkSimulation {
  static simulateNetworkDelay(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static simulateNetworkError(): Promise<never> {
    return Promise.reject(new Error('Network connection failed'));
  }

  static simulateSlowNetwork<T>(data: T, delayMs: number = 3000): Promise<T> {
    return new Promise(resolve => {
      setTimeout(() => resolve(data), delayMs);
    });
  }
}

// Responsive testing utilities
export class ResponsiveTestUtils {
  static setViewport(width: number, height: number): void {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
    window.dispatchEvent(new Event('resize'));
  }

  static readonly BREAKPOINTS = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1200, height: 800 }
  };

  static isMobileViewport(): boolean {
    return window.innerWidth < 768;
  }

  static isTabletViewport(): boolean {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  }

  static isDesktopViewport(): boolean {
    return window.innerWidth >= 1024;
  }
}