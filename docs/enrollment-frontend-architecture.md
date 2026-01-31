# General Multi-Discipline Enrollment Page - Frontend Architecture

## Executive Summary

This document outlines the comprehensive Angular frontend architecture for a new general enrollment page that allows users to enroll in multiple tournament sub-events simultaneously, replacing the current single-event enrollment flow.

**Status**: Design Phase
**Target Route**: `/tournament/:id/enroll`
**Current Location**: `/libs/frontend/pages/tournament/src/pages/`

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Component Architecture](#component-architecture)
3. [State Management Strategy](#state-management-strategy)
4. [Routing Configuration](#routing-configuration)
5. [UI/UX Design](#uiux-design)
6. [Accessibility Requirements](#accessibility-requirements)
7. [Implementation Roadmap](#implementation-roadmap)

---

## Current State Analysis

### Existing Pages

#### 1. `page-enrollment` (Single Event Enrollment)
**Location**: `/libs/frontend/pages/tournament/src/pages/enrollment/`
**Route**: `/tournament/:tournamentId/sub-events/:subEventId/enroll`

**Current Features**:
- Enrollment for **single sub-event only**
- Player search and partner selection (for doubles)
- Guest enrollment support
- Waiting list management
- Real-time enrollment status display
- Cancel enrollment functionality

**Key Components**:
- Smart container: `PageEnrollmentComponent`
- Service: `EnrollmentService` (Angular resource API)
- State: Angular signals + reactive forms
- GraphQL operations: `enrollInTournament`, `enrollGuest`, `cancelEnrollment`

#### 2. `page-my-enrollments` (User Dashboard)
**Location**: `/libs/frontend/pages/tournament/src/pages/my-enrollments/`
**Route**: `/tournament/:tournamentId/my-enrollments`

**Current Features**:
- View all enrollments for a tournament
- Group by status (confirmed, pending, waiting list)
- Cancel enrollments
- Quick links to enroll in available sub-events (one at a time)

**Key Components**:
- Smart container: `PageMyEnrollmentsComponent`
- Service: `MyEnrollmentsService`
- Query: `myTournamentEnrollments`

#### 3. `page-detail` (Tournament Detail)
**Location**: `/libs/frontend/pages/tournament/src/pages/detail/`

**Current Features**:
- Tournament information display
- Sub-events grouped by type (Men/Women/Mixed) and game type (Singles/Doubles)
- Individual "Enroll Now" buttons per sub-event (links to single enrollment page)

### Technology Stack

- **Framework**: Angular 17+ (Standalone components)
- **State Management**: Angular Signals + Reactive Forms
- **Data Fetching**: Apollo GraphQL with Angular Resource API
- **UI Library**: PrimeNG (Buttons, Cards, Tables, Dialogs, Autocomplete)
- **Styling**: Tailwind CSS
- **Form Validation**: Angular Reactive Forms
- **Routing**: Angular Router with `injectParams`
- **Change Detection**: OnPush strategy

### Current Data Models

```typescript
// TournamentSubEvent
interface TournamentSubEvent {
  id: string;
  name: string;
  eventType: SubEventTypeEnum; // M, F, MX
  gameType: GameType; // S (Singles), D (Doubles), MX (Mixed)
  minLevel?: number;
  maxLevel?: number;
  maxEntries?: number;
  waitingListEnabled: boolean;
  confirmedEnrollmentCount?: number;
  pendingEnrollmentCount?: number;
  waitingListCount?: number;
  tournamentEvent?: TournamentEvent;
}

// TournamentEnrollment
interface TournamentEnrollment {
  id: string;
  status: EnrollmentStatus; // CONFIRMED, PENDING, WAITING_LIST, CANCELLED, WITHDRAWN
  tournamentSubEventId: string;
  playerId?: string;
  isGuest: boolean;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  preferredPartnerId?: string;
  confirmedPartnerId?: string;
  waitingListPosition?: number;
  notes?: string;
  createdAt: Date;
}

// Enrollment Status Enum
enum EnrollmentStatus {
  CONFIRMED = 'CONFIRMED',
  PENDING = 'PENDING',
  WAITING_LIST = 'WAITING_LIST',
  CANCELLED = 'CANCELLED',
  WITHDRAWN = 'WITHDRAWN'
}
```

---

## Component Architecture

### Component Tree Diagram

```
page-general-enrollment.component (Smart Container)
├── enrollment-header.component (Presentation)
│   ├── Tournament information
│   ├── Enrollment period status
│   └── Summary statistics
│
├── enrollment-filters.component (Presentation)
│   ├── Search input
│   ├── Event type filter (Men/Women/Mixed)
│   ├── Game type filter (Singles/Doubles/Mixed)
│   ├── Level range filter
│   └── Availability filter (Open/Full/Waiting List)
│
├── sub-event-selection-grid.component (Presentation)
│   ├── sub-event-card.component (Multiple instances)
│   │   ├── Event information display
│   │   ├── Capacity indicator
│   │   ├── Enrollment status badge
│   │   ├── Selection checkbox
│   │   └── Partner selection trigger (doubles only)
│   └── Empty state message
│
├── enrollment-cart.component (Presentation)
│   ├── cart-item.component (Multiple instances)
│   │   ├── Sub-event summary
│   │   ├── Partner info (doubles)
│   │   ├── Notes input
│   │   └── Remove button
│   ├── Cart summary
│   ├── Validation messages
│   └── Submit button
│
└── partner-selection-dialog.component (Presentation)
    ├── Player search autocomplete
    ├── Partner selection options
    └── Confirmation actions
```

### Component Specifications

#### 1. Smart Container Component

**File**: `page-general-enrollment.component.ts`

```typescript
@Component({
  selector: 'app-page-general-enrollment',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    EnrollmentHeaderComponent,
    EnrollmentFiltersComponent,
    SubEventSelectionGridComponent,
    EnrollmentCartComponent,
    PartnerSelectionDialogComponent,
    // PrimeNG modules
  ],
  templateUrl: './page-general-enrollment.component.html',
  styleUrl: './page-general-enrollment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageGeneralEnrollmentComponent {
  // Injected services
  private readonly auth = inject(AuthService);
  private readonly dataService = new GeneralEnrollmentService();

  // Route params
  readonly tournamentId = injectParams('tournamentId');

  // State selectors from service
  tournament = this.dataService.tournament;
  subEvents = this.dataService.subEvents;
  loading = this.dataService.loading;
  error = this.dataService.error;

  // Cart state
  cart = this.dataService.cart;
  cartTotal = this.dataService.cartTotal;
  validationErrors = this.dataService.validationErrors;

  // Filter state
  filters = this.dataService.filters;
  filteredSubEvents = this.dataService.filteredSubEvents;

  // Enrollment submission state
  submitting = this.dataService.submitting;
  submitError = this.dataService.submitError;
  submitSuccess = this.dataService.submitSuccess;

  // Computed properties
  isLoggedIn = computed(() => this.auth.loggedIn());
  isEnrollmentOpen = this.dataService.isEnrollmentOpen;
  canSubmit = this.dataService.canSubmit;

  // Event handlers
  onFilterChange(filters: EnrollmentFilters): void;
  onAddToCart(subEvent: TournamentSubEvent): void;
  onRemoveFromCart(subEventId: string): void;
  onUpdateCartItem(item: CartItem): void;
  onSelectPartner(subEventId: string, partnerId: string): void;
  async onSubmitEnrollments(): Promise<void>;
}
```

#### 2. Enrollment Header Component

**File**: `enrollment-header.component.ts`

```typescript
@Component({
  selector: 'app-enrollment-header',
  standalone: true,
  template: `
    <app-page-header>
      <ng-content title>{{ 'enrollment.general.title' | translate }}</ng-content>
      <ng-content subTitle>
        <div class="flex items-center gap-2 text-sm text-muted-color">
          <a [routerLink]="['/', 'tournament', tournament()?.id]">
            {{ tournament()?.name }}
          </a>
        </div>
      </ng-content>
      <ng-content actions>
        <a [routerLink]="['/', 'tournament', tournament()?.id, 'my-enrollments']"
           class="flex items-center gap-1 px-3 py-1.5 rounded bg-primary-100">
          <i class="pi pi-list"></i>
          <span>{{ 'enrollment.myEnrollments' | translate }}</span>
        </a>
      </ng-content>
    </app-page-header>

    <!-- Status Banner -->
    @if (!isEnrollmentOpen()) {
      <p-message severity="warn" class="w-full mb-4">
        <ng-template pTemplate="content">
          <i class="pi pi-lock"></i>
          <span>{{ 'enrollment.closed' | translate }}</span>
        </ng-template>
      </p-message>
    }

    <!-- Summary Statistics -->
    <div class="grid gap-4 md:grid-cols-4 mb-6">
      <div class="rounded-border bg-blue-50 p-4 text-center">
        <div class="text-2xl font-bold text-blue-600">{{ totalSubEvents() }}</div>
        <div class="text-sm text-blue-800">{{ 'enrollment.totalEvents' | translate }}</div>
      </div>
      <div class="rounded-border bg-green-50 p-4 text-center">
        <div class="text-2xl font-bold text-green-600">{{ availableSubEvents() }}</div>
        <div class="text-sm text-green-800">{{ 'enrollment.available' | translate }}</div>
      </div>
      <div class="rounded-border bg-orange-50 p-4 text-center">
        <div class="text-2xl font-bold text-orange-600">{{ cartCount() }}</div>
        <div class="text-sm text-orange-800">{{ 'enrollment.inCart' | translate }}</div>
      </div>
      <div class="rounded-border bg-purple-50 p-4 text-center">
        <div class="text-2xl font-bold text-purple-600">{{ currentEnrollments() }}</div>
        <div class="text-sm text-purple-800">{{ 'enrollment.myEnrolled' | translate }}</div>
      </div>
    </div>
  `,
})
export class EnrollmentHeaderComponent {
  @Input({ required: true }) tournament = input<TournamentEvent | null>();
  @Input({ required: true }) isEnrollmentOpen = input<boolean>();
  @Input({ required: true }) totalSubEvents = input<number>();
  @Input({ required: true }) availableSubEvents = input<number>();
  @Input({ required: true }) cartCount = input<number>();
  @Input({ required: true }) currentEnrollments = input<number>();
}
```

#### 3. Enrollment Filters Component

**File**: `enrollment-filters.component.ts`

```typescript
export interface EnrollmentFilters {
  searchTerm: string;
  eventTypes: SubEventTypeEnum[]; // M, F, MX
  gameTypes: GameType[]; // S, D, MX
  levelMin?: number;
  levelMax?: number;
  availability: 'all' | 'open' | 'full' | 'waitlist';
  sortBy: 'name' | 'type' | 'capacity' | 'level';
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-enrollment-filters',
  standalone: true,
  template: `
    <p-card class="mb-6">
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <!-- Search Input -->
        <div class="field">
          <label>{{ 'enrollment.filters.search' | translate }}</label>
          <input pInputText
                 [(ngModel)]="filters().searchTerm"
                 (ngModelChange)="onFiltersChange()"
                 placeholder="{{ 'enrollment.filters.searchPlaceholder' | translate }}"
                 class="w-full" />
        </div>

        <!-- Event Type Multi-Select -->
        <div class="field">
          <label>{{ 'enrollment.filters.eventType' | translate }}</label>
          <p-multiSelect
            [(ngModel)]="filters().eventTypes"
            [options]="eventTypeOptions"
            (ngModelChange)="onFiltersChange()"
            optionLabel="label"
            optionValue="value"
            placeholder="{{ 'enrollment.filters.allTypes' | translate }}"
            class="w-full" />
        </div>

        <!-- Game Type Multi-Select -->
        <div class="field">
          <label>{{ 'enrollment.filters.gameType' | translate }}</label>
          <p-multiSelect
            [(ngModel)]="filters().gameTypes"
            [options]="gameTypeOptions"
            (ngModelChange)="onFiltersChange()"
            optionLabel="label"
            optionValue="value"
            placeholder="{{ 'enrollment.filters.allGameTypes' | translate }}"
            class="w-full" />
        </div>

        <!-- Availability Filter -->
        <div class="field">
          <label>{{ 'enrollment.filters.availability' | translate }}</label>
          <p-select
            [(ngModel)]="filters().availability"
            [options]="availabilityOptions"
            (ngModelChange)="onFiltersChange()"
            class="w-full" />
        </div>
      </div>

      <!-- Advanced Filters Toggle -->
      <div class="mt-4">
        <p-button
          label="{{ showAdvanced() ? 'enrollment.filters.hideAdvanced' : 'enrollment.filters.showAdvanced' | translate }}"
          [outlined]="true"
          size="small"
          (onClick)="toggleAdvanced()" />
      </div>

      @if (showAdvanced()) {
        <div class="grid gap-4 md:grid-cols-3 mt-4">
          <!-- Level Range -->
          <div class="field">
            <label>{{ 'enrollment.filters.levelRange' | translate }}</label>
            <p-inputNumber
              [(ngModel)]="filters().levelMin"
              (ngModelChange)="onFiltersChange()"
              [min]="1"
              [max]="12"
              placeholder="Min" />
            <span class="mx-2">-</span>
            <p-inputNumber
              [(ngModel)]="filters().levelMax"
              (ngModelChange)="onFiltersChange()"
              [min]="1"
              [max]="12"
              placeholder="Max" />
          </div>

          <!-- Sort By -->
          <div class="field">
            <label>{{ 'enrollment.filters.sortBy' | translate }}</label>
            <p-select
              [(ngModel)]="filters().sortBy"
              [options]="sortOptions"
              (ngModelChange)="onFiltersChange()"
              class="w-full" />
          </div>

          <!-- Sort Order -->
          <div class="field">
            <label>{{ 'enrollment.filters.sortOrder' | translate }}</label>
            <p-selectButton
              [(ngModel)]="filters().sortOrder"
              [options]="sortOrderOptions"
              (ngModelChange)="onFiltersChange()" />
          </div>
        </div>
      }

      <!-- Active Filters Summary & Clear -->
      @if (hasActiveFilters()) {
        <div class="flex items-center justify-between mt-4 pt-4 border-t">
          <span class="text-sm text-muted-color">
            {{ activeFilterCount() }} {{ 'enrollment.filters.active' | translate }}
          </span>
          <p-button
            label="{{ 'enrollment.filters.clearAll' | translate }}"
            severity="secondary"
            [text]="true"
            size="small"
            (onClick)="clearFilters()" />
        </div>
      }
    </p-card>
  `,
})
export class EnrollmentFiltersComponent {
  @Input({ required: true }) filters = input<Signal<EnrollmentFilters>>();
  @Output() filtersChange = output<EnrollmentFilters>();

  showAdvanced = signal(false);

  eventTypeOptions = [
    { label: this.translate.instant('tournament.types.men'), value: 'M' },
    { label: this.translate.instant('tournament.types.women'), value: 'F' },
    { label: this.translate.instant('tournament.types.mix'), value: 'MX' },
  ];

  gameTypeOptions = [
    { label: this.translate.instant('tournament.gameTypes.singles'), value: 'S' },
    { label: this.translate.instant('tournament.gameTypes.doubles'), value: 'D' },
    { label: this.translate.instant('tournament.gameTypes.mixed'), value: 'MX' },
  ];

  availabilityOptions = [
    { label: this.translate.instant('enrollment.filters.all'), value: 'all' },
    { label: this.translate.instant('enrollment.filters.open'), value: 'open' },
    { label: this.translate.instant('enrollment.filters.full'), value: 'full' },
    { label: this.translate.instant('enrollment.filters.waitlist'), value: 'waitlist' },
  ];

  sortOptions = [
    { label: this.translate.instant('enrollment.filters.byName'), value: 'name' },
    { label: this.translate.instant('enrollment.filters.byType'), value: 'type' },
    { label: this.translate.instant('enrollment.filters.byCapacity'), value: 'capacity' },
    { label: this.translate.instant('enrollment.filters.byLevel'), value: 'level' },
  ];

  sortOrderOptions = [
    { label: 'A-Z', value: 'asc', icon: 'pi pi-sort-alpha-down' },
    { label: 'Z-A', value: 'desc', icon: 'pi pi-sort-alpha-up' },
  ];
}
```

#### 4. Sub-Event Selection Grid Component

**File**: `sub-event-selection-grid.component.ts`

```typescript
@Component({
  selector: 'app-sub-event-selection-grid',
  standalone: true,
  template: `
    @if (loading()) {
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        @for (i of [1,2,3,4,5,6]; track i) {
          <p-skeleton height="12rem" />
        }
      </div>
    } @else if (subEvents().length === 0) {
      <p-card>
        <div class="text-center py-8">
          <i class="pi pi-inbox text-4xl text-muted-color mb-4"></i>
          <p class="text-muted-color">{{ 'enrollment.noEventsFound' | translate }}</p>
          @if (hasActiveFilters()) {
            <p-button
              label="{{ 'enrollment.filters.clearAll' | translate }}"
              [outlined]="true"
              (onClick)="clearFilters.emit()" />
          }
        </div>
      </p-card>
    } @else {
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        @for (subEvent of subEvents(); track subEvent.id) {
          <app-sub-event-card
            [subEvent]="subEvent"
            [isSelected]="isInCart(subEvent.id)"
            [isEnrolled]="isEnrolled(subEvent.id)"
            [isDoubles]="isDoubles(subEvent)"
            [selectedPartner]="getSelectedPartner(subEvent.id)"
            (select)="onSelect.emit(subEvent)"
            (deselect)="onDeselect.emit(subEvent.id)"
            (selectPartner)="onSelectPartner.emit({ subEventId: subEvent.id })" />
        }
      </div>
    }
  `,
})
export class SubEventSelectionGridComponent {
  @Input({ required: true }) subEvents = input<TournamentSubEvent[]>();
  @Input({ required: true }) loading = input<boolean>();
  @Input({ required: true }) hasActiveFilters = input<boolean>();
  @Input({ required: true }) cartItems = input<CartItem[]>();
  @Input({ required: true }) enrolledSubEventIds = input<Set<string>>();

  @Output() select = output<TournamentSubEvent>();
  @Output() deselect = output<string>();
  @Output() selectPartner = output<{ subEventId: string }>();
  @Output() clearFilters = output<void>();

  isInCart = (subEventId: string) => {
    return this.cartItems().some(item => item.subEventId === subEventId);
  };

  isEnrolled = (subEventId: string) => {
    return this.enrolledSubEventIds().has(subEventId);
  };

  isDoubles = (subEvent: TournamentSubEvent) => {
    return subEvent.gameType === 'D' || subEvent.gameType === 'MX';
  };

  getSelectedPartner = (subEventId: string) => {
    return this.cartItems().find(item => item.subEventId === subEventId)?.preferredPartner;
  };
}
```

#### 5. Sub-Event Card Component

**File**: `sub-event-card.component.ts`

```typescript
@Component({
  selector: 'app-sub-event-card',
  standalone: true,
  template: `
    <p-card class="h-full" [ngClass]="{
      'border-2 border-primary': isSelected(),
      'opacity-50': isEnrolled()
    }">
      <!-- Card Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <h4 class="font-semibold text-lg text-primary mb-1">
            {{ subEvent().name }}
          </h4>
          <div class="flex items-center gap-2 text-xs text-muted-color">
            <p-tag [value]="getEventTypeLabel()" severity="info" />
            <p-tag [value]="getGameTypeLabel()" />
            @if (subEvent().minLevel || subEvent().maxLevel) {
              <span class="flex items-center gap-1">
                <i class="pi pi-chart-line"></i>
                Level {{ subEvent().minLevel || '?' }} - {{ subEvent().maxLevel || '?' }}
              </span>
            }
          </div>
        </div>

        <!-- Selection Checkbox -->
        <p-checkbox
          [ngModel]="isSelected()"
          (ngModelChange)="onToggle($event)"
          [binary]="true"
          [disabled]="isEnrolled()"
          [attr.aria-label]="'Select ' + subEvent().name" />
      </div>

      <!-- Capacity Indicator -->
      <div class="mb-4">
        <app-enrollment-capacity-indicator
          [current]="subEvent().confirmedEnrollmentCount || 0"
          [max]="subEvent().maxEntries"
          [pending]="subEvent().pendingEnrollmentCount || 0"
          [waitingList]="subEvent().waitingListCount || 0"
          [waitingListEnabled]="subEvent().waitingListEnabled" />
      </div>

      <!-- Status Badges -->
      <div class="flex flex-wrap gap-2 mb-4">
        @if (isEnrolled()) {
          <p-tag severity="success" value="{{ 'enrollment.alreadyEnrolled' | translate }}"
                 icon="pi pi-check" />
        }
        @if (isFull() && !subEvent().waitingListEnabled) {
          <p-tag severity="danger" value="{{ 'enrollment.full' | translate }}"
                 icon="pi pi-times" />
        }
        @if (isFull() && subEvent().waitingListEnabled) {
          <p-tag severity="warn" value="{{ 'enrollment.waitingListOnly' | translate }}"
                 icon="pi pi-clock" />
        }
      </div>

      <!-- Partner Selection (Doubles only) -->
      @if (isDoubles() && isSelected()) {
        <div class="border-t pt-4">
          <label class="block text-sm font-medium mb-2">
            {{ 'enrollment.partner' | translate }}
          </label>
          @if (selectedPartner()) {
            <div class="flex items-center justify-between p-2 rounded bg-highlight">
              <span class="text-sm">{{ selectedPartner()?.fullName }}</span>
              <p-button
                icon="pi pi-pencil"
                [text]="true"
                size="small"
                (onClick)="selectPartner.emit()"
                pTooltip="{{ 'enrollment.changePartner' | translate }}" />
            </div>
          } @else {
            <p-button
              label="{{ 'enrollment.selectPartner' | translate }}"
              icon="pi pi-users"
              [outlined]="true"
              size="small"
              class="w-full"
              (onClick)="selectPartner.emit()" />
            <small class="text-xs text-muted-color mt-1 block">
              {{ 'enrollment.partnerOptional' | translate }}
            </small>
          }
        </div>
      }
    </p-card>
  `,
})
export class SubEventCardComponent {
  @Input({ required: true }) subEvent = input<TournamentSubEvent>();
  @Input({ required: true }) isSelected = input<boolean>();
  @Input({ required: true }) isEnrolled = input<boolean>();
  @Input({ required: true }) isDoubles = input<boolean>();
  @Input() selectedPartner = input<Player | null>();

  @Output() select = output<void>();
  @Output() deselect = output<void>();
  @Output() selectPartner = output<void>();

  isFull = computed(() => {
    const subEvent = this.subEvent();
    if (!subEvent.maxEntries) return false;
    const confirmed = subEvent.confirmedEnrollmentCount || 0;
    const isDoubles = this.isDoubles();
    const effectiveEntries = isDoubles ? Math.ceil(confirmed / 2) : confirmed;
    return effectiveEntries >= subEvent.maxEntries;
  });

  onToggle(selected: boolean): void {
    if (selected) {
      this.select.emit();
    } else {
      this.deselect.emit();
    }
  }
}
```

#### 6. Enrollment Cart Component

**File**: `enrollment-cart.component.ts`

```typescript
export interface CartItem {
  subEventId: string;
  subEvent: TournamentSubEvent;
  preferredPartnerId?: string;
  preferredPartner?: Player;
  notes?: string;
}

@Component({
  selector: 'app-enrollment-cart',
  standalone: true,
  template: `
    <div class="sticky top-4">
      <p-card>
        <ng-template pTemplate="header">
          <div class="flex items-center justify-between p-4">
            <h3 class="font-semibold text-lg flex items-center gap-2">
              <i class="pi pi-shopping-cart"></i>
              {{ 'enrollment.cart.title' | translate }} ({{ cartItems().length }})
            </h3>
            @if (cartItems().length > 0) {
              <p-button
                label="{{ 'enrollment.cart.clearAll' | translate }}"
                severity="secondary"
                [text]="true"
                size="small"
                (onClick)="clearCart.emit()" />
            }
          </div>
        </ng-template>

        @if (cartItems().length === 0) {
          <div class="text-center py-8">
            <i class="pi pi-shopping-cart text-4xl text-muted-color mb-4"></i>
            <p class="text-muted-color">{{ 'enrollment.cart.empty' | translate }}</p>
            <small class="text-xs text-muted-color">
              {{ 'enrollment.cart.emptyHint' | translate }}
            </small>
          </div>
        } @else {
          <div class="space-y-4">
            @for (item of cartItems(); track item.subEventId) {
              <app-cart-item
                [item]="item"
                (update)="updateItem.emit($event)"
                (remove)="removeItem.emit($event.subEventId)"
                (selectPartner)="selectPartner.emit($event)" />
            }
          </div>

          <!-- Validation Errors -->
          @if (validationErrors().length > 0) {
            <div class="mt-4 p-3 rounded bg-red-50 border border-red-200">
              <h4 class="font-medium text-red-800 mb-2 flex items-center gap-2">
                <i class="pi pi-exclamation-triangle"></i>
                {{ 'enrollment.cart.validationErrors' | translate }}
              </h4>
              <ul class="text-sm text-red-700 space-y-1">
                @for (error of validationErrors(); track error.field) {
                  <li>{{ error.message }}</li>
                }
              </ul>
            </div>
          }

          <!-- Submit Section -->
          <div class="mt-6 pt-4 border-t">
            <div class="space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-color">{{ 'enrollment.cart.totalEvents' | translate }}:</span>
                <span class="font-semibold">{{ cartItems().length }}</span>
              </div>

              @if (hasDoublesEvents()) {
                <div class="flex items-center justify-between text-sm">
                  <span class="text-muted-color">{{ 'enrollment.cart.withPartners' | translate }}:</span>
                  <span class="font-semibold">{{ countWithPartners() }}</span>
                </div>
              }

              @if (hasWaitingList()) {
                <p-message severity="info" class="text-xs">
                  {{ 'enrollment.cart.waitingListNote' | translate }}
                </p-message>
              }

              <p-button
                label="{{ 'enrollment.cart.submitEnrollments' | translate }}"
                icon="pi pi-check"
                class="w-full"
                [loading]="submitting()"
                [disabled]="!canSubmit() || validationErrors().length > 0"
                (onClick)="submit.emit()"
                [attr.aria-label]="'Submit ' + cartItems().length + ' enrollments'" />

              @if (submitError()) {
                <p-message severity="error" [text]="submitError()!" class="w-full text-xs" />
              }
            </div>
          </div>
        }
      </p-card>
    </div>
  `,
})
export class EnrollmentCartComponent {
  @Input({ required: true }) cartItems = input<CartItem[]>();
  @Input({ required: true }) submitting = input<boolean>();
  @Input({ required: true }) canSubmit = input<boolean>();
  @Input({ required: true }) validationErrors = input<ValidationError[]>();
  @Input() submitError = input<string | null>();

  @Output() updateItem = output<CartItem>();
  @Output() removeItem = output<CartItem>();
  @Output() selectPartner = output<{ subEventId: string }>();
  @Output() clearCart = output<void>();
  @Output() submit = output<void>();

  hasDoublesEvents = computed(() =>
    this.cartItems().some(item =>
      item.subEvent.gameType === 'D' || item.subEvent.gameType === 'MX'
    )
  );

  countWithPartners = computed(() =>
    this.cartItems().filter(item => item.preferredPartnerId).length
  );

  hasWaitingList = computed(() =>
    this.cartItems().some(item => {
      const se = item.subEvent;
      if (!se.maxEntries) return false;
      const confirmed = se.confirmedEnrollmentCount || 0;
      return confirmed >= se.maxEntries && se.waitingListEnabled;
    })
  );
}
```

#### 7. Partner Selection Dialog Component

**File**: `partner-selection-dialog.component.ts`

```typescript
@Component({
  selector: 'app-partner-selection-dialog',
  standalone: true,
  template: `
    <p-dialog
      header="{{ 'enrollment.partner.title' | translate }}"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '450px' }"
      (onHide)="close.emit()">

      <div class="space-y-4">
        <!-- Sub-Event Info -->
        @if (subEvent(); as se) {
          <div class="p-3 rounded bg-highlight">
            <div class="font-medium">{{ se.name }}</div>
            <div class="text-xs text-muted-color">{{ se.eventType }} - {{ se.gameType }}</div>
          </div>
        }

        <!-- Partner Search -->
        <div class="field">
          <label class="block font-medium mb-2">
            {{ 'enrollment.partner.search' | translate }}
          </label>
          <p-autoComplete
            [(ngModel)]="selectedPartner"
            [suggestions]="playerSuggestions()"
            (completeMethod)="searchPartners($event)"
            field="fullName"
            [dropdown]="false"
            placeholder="{{ 'enrollment.partner.searchPlaceholder' | translate }}"
            class="w-full"
            [showClear]="true"
            [attr.aria-label]="'Search for partner'" />
          <small class="text-muted-color mt-1 block">
            {{ 'enrollment.partner.hint' | translate }}
          </small>
        </div>

        <!-- Looking for Partner List -->
        @if (lookingForPartner().length > 0) {
          <div class="field">
            <label class="block font-medium mb-2">
              {{ 'enrollment.partner.available' | translate }}
            </label>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              @for (player of lookingForPartner(); track player.id) {
                <div class="flex items-center justify-between p-2 rounded hover:bg-highlight cursor-pointer"
                     (click)="selectPlayer(player)">
                  <div>
                    <div class="font-medium">{{ player.fullName }}</div>
                    <div class="text-xs text-muted-color">{{ player.memberId }}</div>
                  </div>
                  <p-button
                    icon="pi pi-check"
                    [text]="true"
                    size="small" />
                </div>
              }
            </div>
          </div>
        }

        <!-- No Partner Option -->
        <div class="flex items-center gap-2 p-3 rounded bg-blue-50 border border-blue-200">
          <i class="pi pi-info-circle text-blue-600"></i>
          <span class="text-sm text-blue-800">
            {{ 'enrollment.partner.noPartnerInfo' | translate }}
          </span>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="{{ 'common.cancel' | translate }}"
            severity="secondary"
            [outlined]="true"
            (onClick)="close.emit()" />
          <p-button
            label="{{ selectedPartner ? 'enrollment.partner.confirm' : 'enrollment.partner.noPartner' | translate }}"
            (onClick)="confirm()"
            [loading]="searching()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class PartnerSelectionDialogComponent {
  @Input({ required: true }) visible = input<boolean>();
  @Input({ required: true }) subEvent = input<TournamentSubEvent | null>();
  @Input({ required: true }) currentPartner = input<Player | null>();
  @Input({ required: true }) playerSuggestions = input<Player[]>();
  @Input({ required: true }) lookingForPartner = input<Player[]>();
  @Input({ required: true }) searching = input<boolean>();

  @Output() close = output<void>();
  @Output() confirm = output<Player | null>();
  @Output() search = output<string>();

  selectedPartner: Player | null = null;

  ngOnInit() {
    this.selectedPartner = this.currentPartner();
  }

  searchPartners(event: AutoCompleteCompleteEvent) {
    this.search.emit(event.query);
  }

  selectPlayer(player: Player) {
    this.selectedPartner = player;
  }

  confirm() {
    this.confirm.emit(this.selectedPartner);
  }
}
```

---

## State Management Strategy

### Service Architecture

**File**: `page-general-enrollment.service.ts`

```typescript
export class GeneralEnrollmentService {
  private readonly apollo = inject(Apollo);
  private readonly auth = inject(AuthService);

  // Form controls for filters
  filterForm = new FormGroup({
    searchTerm: new FormControl<string>(''),
    eventTypes: new FormControl<SubEventTypeEnum[]>([]),
    gameTypes: new FormControl<GameType[]>([]),
    levelMin: new FormControl<number | null>(null),
    levelMax: new FormControl<number | null>(null),
    availability: new FormControl<'all' | 'open' | 'full' | 'waitlist'>('all'),
    sortBy: new FormControl<'name' | 'type' | 'capacity' | 'level'>('name'),
    sortOrder: new FormControl<'asc' | 'desc'>('asc'),
  });

  // Cart state (local signal-based state)
  private cartState = signal<CartItem[]>([]);
  cart = this.cartState.asReadonly();

  // Filter signal for resource
  private filterSignal = toSignal(this.filterForm.valueChanges, {
    initialValue: this.filterForm.value,
  });

  // Tournament ID signal (set from component)
  tournamentIdSignal = signal<string | null>(null);

  // Data resource for tournament and sub-events
  private dataResource = resource({
    params: () => ({
      tournamentId: this.tournamentIdSignal(),
      userId: this.auth.user()?.id,
    }),
    loader: async ({ params, abortSignal }) => {
      if (!params.tournamentId) return null;

      const result = await lastValueFrom(
        this.apollo.query<{
          tournamentEvent: TournamentEvent & {
            tournamentSubEvents: TournamentSubEvent[];
          };
          myTournamentEnrollments: TournamentEnrollment[];
        }>({
          query: GENERAL_ENROLLMENT_QUERY,
          variables: {
            id: params.tournamentId,
            tournamentEventId: params.tournamentId,
          },
          context: { signal: abortSignal },
          fetchPolicy: 'network-only',
        })
      );

      return {
        tournament: result.data.tournamentEvent,
        subEvents: result.data.tournamentEvent.tournamentSubEvents,
        myEnrollments: result.data.myTournamentEnrollments,
      };
    },
  });

  // Public selectors
  data = computed(() => this.dataResource.value());
  tournament = computed(() => this.data()?.tournament);
  subEvents = computed(() => this.data()?.subEvents ?? []);
  myEnrollments = computed(() => this.data()?.myEnrollments ?? []);
  loading = computed(() => this.dataResource.isLoading());
  error = computed(() => this.dataResource.error()?.message || null);

  // Derived state
  isEnrollmentOpen = computed(() =>
    this.tournament()?.phase === 'ENROLLMENT_OPEN'
  );

  enrolledSubEventIds = computed(() =>
    new Set(this.myEnrollments().map(e => e.tournamentSubEventId))
  );

  // Filtered sub-events based on filter form
  filteredSubEvents = computed(() => {
    const subEvents = this.subEvents();
    const filters = this.filterSignal();

    let filtered = [...subEvents];

    // Search term
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(se =>
        se.name?.toLowerCase().includes(term)
      );
    }

    // Event types
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      filtered = filtered.filter(se =>
        filters.eventTypes!.includes(se.eventType!)
      );
    }

    // Game types
    if (filters.gameTypes && filters.gameTypes.length > 0) {
      filtered = filtered.filter(se =>
        filters.gameTypes!.includes(se.gameType!)
      );
    }

    // Level range
    if (filters.levelMin) {
      filtered = filtered.filter(se =>
        (se.maxLevel || 999) >= filters.levelMin!
      );
    }
    if (filters.levelMax) {
      filtered = filtered.filter(se =>
        (se.minLevel || 0) <= filters.levelMax!
      );
    }

    // Availability
    if (filters.availability !== 'all') {
      filtered = filtered.filter(se => {
        const isFull = this.isSubEventFull(se);
        switch (filters.availability) {
          case 'open': return !isFull;
          case 'full': return isFull && !se.waitingListEnabled;
          case 'waitlist': return isFull && se.waitingListEnabled;
          default: return true;
        }
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'type':
          comparison = (a.eventType || '').localeCompare(b.eventType || '');
          break;
        case 'capacity':
          comparison = (a.maxEntries || 0) - (b.maxEntries || 0);
          break;
        case 'level':
          comparison = (a.minLevel || 0) - (b.minLevel || 0);
          break;
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  });

  // Cart operations
  cartTotal = computed(() => this.cart().length);

  validationErrors = computed(() => {
    const errors: ValidationError[] = [];
    const cart = this.cart();

    cart.forEach(item => {
      const isDoubles = item.subEvent.gameType === 'D' || item.subEvent.gameType === 'MX';
      // Add validation rules as needed
      // Example: Required partner for certain doubles events
    });

    return errors;
  });

  canSubmit = computed(() =>
    this.cart().length > 0 &&
    this.validationErrors().length === 0 &&
    !this.submitting()
  );

  // Submission state
  submitting = signal(false);
  submitError = signal<string | null>(null);
  submitSuccess = signal(false);

  // Methods
  addToCart(subEvent: TournamentSubEvent): void {
    const existing = this.cart().find(item => item.subEventId === subEvent.id);
    if (existing) return;

    this.cartState.update(items => [
      ...items,
      {
        subEventId: subEvent.id,
        subEvent,
      },
    ]);
  }

  removeFromCart(subEventId: string): void {
    this.cartState.update(items =>
      items.filter(item => item.subEventId !== subEventId)
    );
  }

  updateCartItem(updated: CartItem): void {
    this.cartState.update(items =>
      items.map(item =>
        item.subEventId === updated.subEventId ? updated : item
      )
    );
  }

  clearCart(): void {
    this.cartState.set([]);
  }

  async submitEnrollments(): Promise<boolean> {
    this.submitting.set(true);
    this.submitError.set(null);
    this.submitSuccess.set(false);

    try {
      const items = this.cart();

      // Submit all enrollments in parallel
      const results = await Promise.allSettled(
        items.map(item => this.enrollInSubEvent(item))
      );

      // Check for errors
      const errors = results.filter(r => r.status === 'rejected');
      if (errors.length > 0) {
        this.submitError.set(
          `${errors.length} enrollment(s) failed. Please check and try again.`
        );
        return false;
      }

      // Success - clear cart and reload
      this.clearCart();
      this.submitSuccess.set(true);
      this.dataResource.reload();

      return true;
    } catch (err: any) {
      this.submitError.set(err.message || 'Failed to submit enrollments');
      return false;
    } finally {
      this.submitting.set(false);
    }
  }

  private async enrollInSubEvent(item: CartItem): Promise<TournamentEnrollment> {
    const result = await lastValueFrom(
      this.apollo.mutate<{ enrollInTournament: TournamentEnrollment }>({
        mutation: ENROLL_MUTATION,
        variables: {
          input: {
            tournamentSubEventId: item.subEventId,
            preferredPartnerId: item.preferredPartnerId,
            notes: item.notes,
          },
        },
      })
    );

    if (!result.data?.enrollInTournament) {
      throw new Error('Enrollment failed');
    }

    return result.data.enrollInTournament;
  }

  private isSubEventFull(subEvent: TournamentSubEvent): boolean {
    if (!subEvent.maxEntries) return false;
    const confirmed = subEvent.confirmedEnrollmentCount || 0;
    const isDoubles = subEvent.gameType === 'D' || subEvent.gameType === 'MX';
    const effectiveEntries = isDoubles ? Math.ceil(confirmed / 2) : confirmed;
    return effectiveEntries >= subEvent.maxEntries;
  }

  // Player search for partner selection
  async searchPlayers(query: string): Promise<Player[]> {
    if (!query || query.length < 2) return [];

    try {
      const result = await lastValueFrom(
        this.apollo.query<{ players: Player[] }>({
          query: SEARCH_PLAYERS_QUERY,
          variables: {
            args: {
              where: { fullName: { $iLike: `%${query}%` } },
              take: 10,
            },
          },
        })
      );

      // Filter out current user
      const userId = this.auth.user()?.id;
      return result.data.players.filter(p => p.id !== userId);
    } catch {
      return [];
    }
  }
}
```

### GraphQL Queries

```graphql
# GENERAL_ENROLLMENT_QUERY
query GeneralEnrollment($id: ID!, $tournamentEventId: ID!) {
  tournamentEvent(id: $id) {
    id
    name
    slug
    phase
    allowGuestEnrollments
    enrollmentOpenDate
    enrollmentCloseDate
    tournamentSubEvents {
      id
      name
      eventType
      gameType
      minLevel
      maxLevel
      maxEntries
      waitingListEnabled
      confirmedEnrollmentCount
      pendingEnrollmentCount
      waitingListCount
    }
  }
  myTournamentEnrollments(tournamentEventId: $tournamentEventId) {
    id
    status
    tournamentSubEventId
    tournamentSubEvent {
      id
      name
    }
    preferredPartner {
      id
      fullName
    }
    confirmedPartner {
      id
      fullName
    }
  }
}

# ENROLL_MUTATION (reuse existing)
mutation EnrollInTournament($input: EnrollPlayerInput!) {
  enrollInTournament(input: $input) {
    id
    status
    tournamentSubEventId
  }
}

# SEARCH_PLAYERS_QUERY (reuse existing)
query SearchPlayers($args: PlayerArgs) {
  players(args: $args) {
    id
    fullName
    memberId
  }
}
```

---

## Routing Configuration

### Updated Routes

**File**: `libs/frontend/pages/tournament/src/lib.routes.ts`

```typescript
export const routes: Route[] = [
  {
    path: '',
    component: CenterLayoutComponent,
    children: [
      { path: '', component: PageOverviewComponent },
      {
        path: ':tournamentId',
        children: [
          {
            path: '',
            component: PageDetailComponent,
          },
          {
            path: 'admin',
            component: PageAdminComponent,
          },
          // NEW: General enrollment page
          {
            path: 'enroll',
            component: PageGeneralEnrollmentComponent,
          },
          {
            path: 'my-enrollments',
            component: PageMyEnrollmentsComponent,
          },
          // Keep existing single enrollment for backward compatibility
          {
            path: 'sub-events/:subEventId/enroll',
            component: PageEnrollmentComponent,
          },
        ],
      },
    ],
  },
  // ... rest of routes
];
```

### Navigation Updates

Update tournament detail page to link to general enrollment:

**File**: `page-detail.component.html`

```html
<!-- Replace individual "Enroll Now" buttons with general enrollment link -->
@if (tournament.phase === 'ENROLLMENT_OPEN') {
  <div class="mt-6 text-center">
    <a [routerLink]="['/', 'tournament', tournament.id, 'enroll']"
       class="inline-flex items-center gap-2 px-6 py-3 rounded bg-primary text-primary-contrast hover:bg-primary-emphasis transition-colors no-underline font-medium text-lg">
      <i class="pi pi-shopping-cart"></i>
      <span>{{ 'enrollment.general.browseAndEnroll' | translate }}</span>
    </a>
  </div>
}
```

### Deep Linking Support

The page supports deep linking with pre-selected events:

```
/tournament/:id/enroll?selected=subEventId1,subEventId2
```

Implement in component:

```typescript
constructor() {
  // Handle query params for pre-selected events
  effect(() => {
    const route = inject(ActivatedRoute);
    const queryParams = toSignal(route.queryParams);
    const selected = queryParams()?.['selected'];

    if (selected) {
      const ids = selected.split(',');
      const subEvents = this.dataService.subEvents();
      ids.forEach(id => {
        const se = subEvents.find(s => s.id === id);
        if (se) this.dataService.addToCart(se);
      });
    }
  });
}
```

---

## UI/UX Design

### Wireframes (ASCII)

#### Desktop Layout (1920x1080)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Header: General Enrollment | Tournament Name                        │
│ [My Enrollments Button]                                             │
├─────────────────────────────────────────────────────────────────────┤
│ Summary Stats: [Total: 24] [Available: 18] [In Cart: 3] [Enrolled: 2] │
├─────────────────────────────────────────────────────────────────────┤
│ Filters Panel                                                        │
│ [Search] [Event Type ▼] [Game Type ▼] [Availability ▼]             │
│ [Show Advanced Filters ▼]                                           │
├───────────────────────────────────┬─────────────────────────────────┤
│ Sub-Event Grid (2/3 width)        │ Enrollment Cart (1/3 width)     │
│                                    │ ┌─────────────────────────────┐ │
│ ┌─────┬─────┬─────┐               │ │ Cart (3 items)              │ │
│ │ MX  │ MS  │ WD  │               │ │ [Clear All]                 │ │
│ │ A   │ B   │ C   │               │ ├─────────────────────────────┤ │
│ │ ☐   │ ☑   │ ☐   │               │ │ ✓ Men's Singles B           │ │
│ │Cap: │Cap: │Cap: │               │ │   Partner: John Doe         │ │
│ │8/16 │4/8  │12/16│               │ │   [Edit] [Remove]           │ │
│ └─────┴─────┴─────┘               │ ├─────────────────────────────┤ │
│ ┌─────┬─────┬─────┐               │ │ ✓ Women's Doubles C         │ │
│ │ MD  │ WS  │ MX  │               │ │   Partner: (Select)         │ │
│ │ D   │ E   │ F   │               │ │   [Edit] [Remove]           │ │
│ │ ☑   │ ☐   │ ☑   │               │ ├─────────────────────────────┤ │
│ │Cap: │Cap: │Cap: │               │ │ ✓ Mixed Doubles F           │ │
│ │6/12 │10/16│8/12 │               │ │   Partner: (Select)         │ │
│ └─────┴─────┴─────┘               │ │   [Edit] [Remove]           │ │
│                                    │ ├─────────────────────────────┤ │
│ [Load More...]                     │ │ Total Events: 3             │ │
│                                    │ │ With Partners: 1            │ │
│                                    │ │                             │ │
│                                    │ │ [Submit Enrollments] 🛒     │ │
│                                    │ └─────────────────────────────┘ │
└───────────────────────────────────┴─────────────────────────────────┘
```

#### Mobile Layout (375x667)

```
┌─────────────────────────┐
│ ☰ General Enrollment    │
│ Tournament Name         │
├─────────────────────────┤
│ Stats: 24|18|3|2        │
├─────────────────────────┤
│ [Cart (3)] [Filters]    │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ Men's Singles B     │ │
│ │ [M] [S] Level 7-9   │ │
│ │ ☑ Selected          │ │
│ │ Capacity: 4/8       │ │
│ │ Partner: John Doe   │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Women's Doubles C   │ │
│ │ [F] [D] Level 5-7   │ │
│ │ ☐ Not Selected      │ │
│ │ Capacity: 12/16     │ │
│ └─────────────────────┘ │
│ ...                     │
├─────────────────────────┤
│ [Submit 3 Enrollments]  │
└─────────────────────────┘
```

### Visual Design Patterns

#### Color Coding

- **Primary Blue**: Selected items, call-to-action buttons
- **Green**: Confirmed enrollments, available capacity
- **Orange**: Pending enrollments, items in cart
- **Red**: Full capacity, errors, remove actions
- **Purple**: Current user's enrollments
- **Gray**: Disabled/unavailable items

#### Status Badges

```html
<!-- Available -->
<p-tag severity="success" value="Available" icon="pi pi-check" />

<!-- Full (No Waiting List) -->
<p-tag severity="danger" value="Full" icon="pi pi-times" />

<!-- Waiting List Available -->
<p-tag severity="warn" value="Waiting List" icon="pi pi-clock" />

<!-- Already Enrolled -->
<p-tag severity="info" value="Enrolled" icon="pi pi-check-circle" />
```

#### Capacity Indicator Component

```typescript
@Component({
  selector: 'app-enrollment-capacity-indicator',
  template: `
    <div class="space-y-1">
      <div class="flex items-center justify-between text-xs">
        <span class="text-muted-color">Capacity</span>
        <span class="font-medium">
          {{ current }} / {{ max || '∞' }}
        </span>
      </div>

      <!-- Progress Bar -->
      @if (max) {
        <div class="h-2 bg-surface-200 rounded-full overflow-hidden">
          <div class="h-full transition-all"
               [style.width.%]="percentage"
               [ngClass]="{
                 'bg-green-500': percentage < 70,
                 'bg-orange-500': percentage >= 70 && percentage < 100,
                 'bg-red-500': percentage >= 100
               }">
          </div>
        </div>
      }

      <!-- Additional Info -->
      <div class="flex items-center justify-between text-xs text-muted-color">
        @if (pending > 0) {
          <span>{{ pending }} pending</span>
        }
        @if (waitingList > 0) {
          <span>{{ waitingList }} waiting</span>
        }
      </div>
    </div>
  `,
})
export class EnrollmentCapacityIndicatorComponent {
  @Input({ required: true }) current = input<number>();
  @Input() max = input<number | null>();
  @Input() pending = input<number>(0);
  @Input() waitingList = input<number>(0);
  @Input() waitingListEnabled = input<boolean>(false);

  percentage = computed(() => {
    const max = this.max();
    if (!max) return 0;
    return Math.min((this.current() / max) * 100, 100);
  });
}
```

### Responsive Design Breakpoints

```scss
// Mobile First Approach
.enrollment-layout {
  display: grid;
  gap: 1.5rem;

  // Mobile: Stack vertically
  grid-template-columns: 1fr;

  // Tablet (768px+): Cart becomes sidebar
  @media (min-width: 768px) {
    grid-template-columns: 1fr;
  }

  // Desktop (1024px+): 2/3 + 1/3 layout
  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }

  // Large Desktop (1440px+): 3-column grid
  @media (min-width: 1440px) {
    .sub-event-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
}

// Sticky cart on desktop
@media (min-width: 1024px) {
  .enrollment-cart {
    position: sticky;
    top: 1rem;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
  }
}
```

### Loading States

```typescript
// Skeleton loaders for initial page load
<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  @for (i of [1,2,3,4,5,6]; track i) {
    <p-skeleton height="12rem" />
  }
</div>

// Individual card loading state
<div class="opacity-50 pointer-events-none">
  <p-skeleton height="8rem" />
</div>

// Submission loading state (optimistic UI)
@if (submitting()) {
  <p-progressBar mode="indeterminate" />
  <p-message severity="info" text="Submitting enrollments..." />
}
```

### Error States

```typescript
// Global error message
@if (error()) {
  <p-message severity="error" class="mb-4">
    <ng-template pTemplate="content">
      <div class="flex items-center gap-2">
        <i class="pi pi-exclamation-triangle"></i>
        <div>
          <div class="font-medium">{{ 'enrollment.error.title' | translate }}</div>
          <div class="text-sm">{{ error() }}</div>
        </div>
      </div>
    </ng-template>
  </p-message>
}

// Validation errors in cart
<div class="p-3 rounded bg-red-50 border border-red-200">
  <h4 class="font-medium text-red-800 mb-2">
    <i class="pi pi-exclamation-triangle"></i>
    Validation Errors
  </h4>
  <ul class="text-sm text-red-700 space-y-1">
    @for (error of validationErrors(); track error.field) {
      <li>{{ error.message }}</li>
    }
  </ul>
</div>
```

### Success States

```typescript
// Toast notification on successful enrollment
@if (submitSuccess()) {
  <p-toast position="top-center" />

  // Trigger toast
  this.messageService.add({
    severity: 'success',
    summary: 'Enrollments Submitted',
    detail: `Successfully enrolled in ${count} event(s)`,
    life: 5000,
  });

  // Redirect to my-enrollments after 2 seconds
  setTimeout(() => {
    this.router.navigate(['/', 'tournament', this.tournamentId(), 'my-enrollments']);
  }, 2000);
}
```

---

## Accessibility Requirements

### WCAG 2.1 Level AA Compliance Checklist

#### Keyboard Navigation

- ✅ **Tab Order**: Logical flow through filters → sub-event cards → cart → submit
- ✅ **Focus Indicators**: Visible focus rings on all interactive elements
- ✅ **Keyboard Shortcuts**:
  - `Enter/Space`: Select/deselect sub-event
  - `Escape`: Close dialogs
  - `Tab`: Navigate between elements
  - `Shift+Tab`: Navigate backward

```typescript
// Focus management for dialogs
@ViewChild(PartnerSelectionDialogComponent)
partnerDialog!: PartnerSelectionDialogComponent;

openPartnerDialog(subEventId: string) {
  this.partnerDialog.open();
  // Focus first input after dialog opens
  setTimeout(() => {
    this.partnerDialog.searchInput?.nativeElement?.focus();
  }, 100);
}
```

#### ARIA Labels

```html
<!-- Sub-event card -->
<div role="article"
     aria-labelledby="event-{{ subEvent.id }}-name"
     aria-describedby="event-{{ subEvent.id }}-capacity">
  <h4 id="event-{{ subEvent.id }}-name">{{ subEvent.name }}</h4>

  <p-checkbox
    [attr.aria-label]="'Select ' + subEvent.name + ' for enrollment'"
    [attr.aria-checked]="isSelected()"
    role="checkbox" />

  <div id="event-{{ subEvent.id }}-capacity" aria-live="polite">
    {{ current }} of {{ max }} spots filled
  </div>
</div>

<!-- Cart -->
<div role="region" aria-label="Enrollment cart">
  <h3 id="cart-title">Cart ({{ cartItems().length }} items)</h3>

  <ul role="list" aria-labelledby="cart-title">
    @for (item of cartItems(); track item.subEventId) {
      <li role="listitem">
        <span>{{ item.subEvent.name }}</span>
        <button [attr.aria-label]="'Remove ' + item.subEvent.name + ' from cart'"
                (click)="removeItem(item)">
          <i class="pi pi-times" aria-hidden="true"></i>
        </button>
      </li>
    }
  </ul>
</div>

<!-- Submit button -->
<button type="button"
        [attr.aria-label]="'Submit ' + cartItems().length + ' enrollment' + (cartItems().length === 1 ? '' : 's')"
        [disabled]="!canSubmit()"
        [attr.aria-disabled]="!canSubmit()">
  Submit Enrollments
</button>
```

#### Screen Reader Announcements

```typescript
// Live region for dynamic updates
<div aria-live="polite" aria-atomic="true" class="sr-only">
  @if (cartChangeAnnouncement()) {
    {{ cartChangeAnnouncement() }}
  }
</div>

// Component logic
cartChangeAnnouncement = signal<string>('');

addToCart(subEvent: TournamentSubEvent) {
  this.dataService.addToCart(subEvent);
  this.cartChangeAnnouncement.set(
    `${subEvent.name} added to cart. Cart now has ${this.cart().length} items.`
  );
  setTimeout(() => this.cartChangeAnnouncement.set(''), 3000);
}

removeFromCart(subEventId: string) {
  const item = this.cart().find(i => i.subEventId === subEventId);
  this.dataService.removeFromCart(subEventId);
  this.cartChangeAnnouncement.set(
    `${item?.subEvent.name} removed from cart. Cart now has ${this.cart().length} items.`
  );
  setTimeout(() => this.cartChangeAnnouncement.set(''), 3000);
}
```

#### Color Contrast

- Text: Minimum 4.5:1 ratio for normal text
- Large text: Minimum 3:1 ratio
- Interactive elements: Minimum 3:1 ratio

```scss
// Tailwind CSS custom color palette (ensure WCAG compliance)
:root {
  --primary-contrast: #1e40af; // Blue 800 (AA compliant on white)
  --success-contrast: #166534; // Green 800
  --warning-contrast: #92400e; // Orange 800
  --danger-contrast: #991b1b; // Red 800
}

// PrimeNG theme overrides
.p-component {
  // Ensure focus indicators are visible
  &:focus-visible {
    outline: 2px solid var(--primary-contrast);
    outline-offset: 2px;
  }
}
```

#### Form Labels

```html
<!-- All inputs must have associated labels -->
<div class="field">
  <label for="search-events" class="block font-medium mb-2">
    {{ 'enrollment.filters.search' | translate }}
  </label>
  <input id="search-events"
         pInputText
         type="search"
         [(ngModel)]="searchTerm"
         [attr.aria-describedby]="'search-hint'"
         placeholder="{{ 'enrollment.filters.searchPlaceholder' | translate }}" />
  <small id="search-hint" class="text-muted-color">
    {{ 'enrollment.filters.searchHint' | translate }}
  </small>
</div>
```

#### Error Identification

```html
<!-- Clear error messages linked to inputs -->
<div class="field" [class.p-invalid]="hasError('preferredPartner')">
  <label for="partner-input" class="block font-medium mb-2">
    {{ 'enrollment.partner.label' | translate }}
    <span aria-label="required" class="text-red-600">*</span>
  </label>

  <p-autoComplete
    inputId="partner-input"
    [attr.aria-invalid]="hasError('preferredPartner')"
    [attr.aria-describedby]="hasError('preferredPartner') ? 'partner-error' : null" />

  @if (hasError('preferredPartner')) {
    <small id="partner-error" class="p-error" role="alert">
      {{ getError('preferredPartner') }}
    </small>
  }
</div>
```

#### Skip Links

```html
<!-- Allow keyboard users to skip to main content -->
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-contrast">
  Skip to enrollment content
</a>

<main id="main-content" tabindex="-1">
  <!-- Page content -->
</main>
```

#### Semantic HTML

```html
<!-- Use semantic elements for structure -->
<article class="enrollment-page">
  <header>
    <h1>{{ 'enrollment.general.title' | translate }}</h1>
  </header>

  <nav aria-label="Enrollment filters">
    <form role="search">
      <!-- Filters -->
    </form>
  </nav>

  <main>
    <section aria-labelledby="available-events-heading">
      <h2 id="available-events-heading">Available Events</h2>
      <!-- Sub-event grid -->
    </section>
  </main>

  <aside aria-labelledby="cart-heading">
    <h2 id="cart-heading">Enrollment Cart</h2>
    <!-- Cart content -->
  </aside>
</article>
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Tasks**:
1. Create component structure and files
2. Set up routing configuration
3. Implement `GeneralEnrollmentService` with GraphQL queries
4. Build basic layout with header and empty states
5. Unit tests for service logic

**Deliverables**:
- Empty page accessible at `/tournament/:id/enroll`
- Service with data fetching working
- Basic routing and navigation

### Phase 2: Core Features (Week 3-4)

**Tasks**:
1. Implement filter component with all filter options
2. Build sub-event selection grid with card components
3. Implement cart functionality (add/remove/update)
4. Partner selection dialog for doubles events
5. Form validation logic

**Deliverables**:
- Fully functional filtering system
- Sub-event selection and cart management
- Partner selection for doubles
- Client-side validation

### Phase 3: Submission & Integration (Week 5)

**Tasks**:
1. Implement bulk enrollment submission
2. Error handling and retry logic
3. Optimistic UI updates
4. Success/error notifications
5. Integration with existing enrollment pages

**Deliverables**:
- Working enrollment submission
- Error handling and user feedback
- Navigation between pages

### Phase 4: Polish & Accessibility (Week 6)

**Tasks**:
1. Responsive design refinement
2. Accessibility audit and fixes
3. Loading states and skeleton loaders
4. Animation and transitions
5. Cross-browser testing

**Deliverables**:
- Mobile-responsive design
- WCAG 2.1 AA compliance
- Polished user experience

### Phase 5: Testing & Documentation (Week 7)

**Tasks**:
1. End-to-end testing with Cypress/Playwright
2. Unit test coverage > 80%
3. User acceptance testing
4. Documentation and code comments
5. Performance optimization

**Deliverables**:
- Comprehensive test suite
- User documentation
- Performance benchmarks

### Phase 6: Deployment (Week 8)

**Tasks**:
1. Feature flag implementation
2. Gradual rollout to users
3. Monitor analytics and error tracking
4. Gather user feedback
5. Iterate based on feedback

**Deliverables**:
- Production deployment
- Monitoring dashboards
- User feedback collection

---

## Technical Considerations

### Performance Optimization

1. **Virtual Scrolling**: For tournaments with 100+ sub-events
   ```typescript
   <cdk-virtual-scroll-viewport itemSize="200" class="h-[600px]">
     <div *cdkVirtualFor="let subEvent of filteredSubEvents()">
       <app-sub-event-card [subEvent]="subEvent" />
     </div>
   </cdk-virtual-scroll-viewport>
   ```

2. **Lazy Loading**: Load partner suggestions only when needed
3. **Debounced Search**: 300ms debounce on search input
4. **Memoization**: Use computed signals for expensive operations
5. **OnPush Change Detection**: Minimize change detection cycles

### Error Handling

1. **GraphQL Error Mapping**: User-friendly error messages
2. **Retry Logic**: Automatic retry for network failures
3. **Partial Success**: Handle mixed success/failure in bulk operations
4. **Rollback**: Ability to undo failed enrollments

### Browser Compatibility

- **Target**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Polyfills**: None required (Angular handles transpilation)
- **Testing**: BrowserStack for cross-browser validation

### Security Considerations

1. **Authorization**: Server-side validation of enrollment permissions
2. **Rate Limiting**: Prevent spam enrollments
3. **Input Sanitization**: XSS prevention on notes fields
4. **CSRF Protection**: Angular HTTP client handles CSRF tokens

---

## Appendix

### Translation Keys (i18n)

```json
{
  "enrollment": {
    "general": {
      "title": "Enroll in Events",
      "browseAndEnroll": "Browse & Enroll in Multiple Events"
    },
    "filters": {
      "search": "Search Events",
      "searchPlaceholder": "Search by name...",
      "eventType": "Event Type",
      "gameType": "Game Type",
      "availability": "Availability",
      "levelRange": "Level Range",
      "sortBy": "Sort By",
      "sortOrder": "Order",
      "showAdvanced": "Show Advanced Filters",
      "hideAdvanced": "Hide Advanced Filters",
      "clearAll": "Clear All Filters",
      "active": "active filter(s)",
      "allTypes": "All Types",
      "allGameTypes": "All Game Types",
      "all": "All Events",
      "open": "Open for Enrollment",
      "full": "Full",
      "waitlist": "Waiting List Available"
    },
    "cart": {
      "title": "Enrollment Cart",
      "empty": "Your cart is empty",
      "emptyHint": "Select events from the left to add them to your cart",
      "clearAll": "Clear All",
      "totalEvents": "Total Events",
      "withPartners": "With Partners",
      "waitingListNote": "Some events may place you on a waiting list",
      "submitEnrollments": "Submit Enrollments",
      "validationErrors": "Please fix the following errors"
    },
    "partner": {
      "title": "Select Partner",
      "search": "Search for Partner",
      "searchPlaceholder": "Type name or member ID...",
      "hint": "Search for a player to partner with, or leave empty to be paired automatically",
      "available": "Players Looking for Partner",
      "confirm": "Confirm Partner",
      "noPartner": "Continue Without Partner",
      "changePartner": "Change Partner",
      "optional": "Partner selection is optional",
      "noPartnerInfo": "You can enroll without selecting a partner and be paired later"
    }
  }
}
```

### File Structure

```
libs/frontend/pages/tournament/src/pages/general-enrollment/
├── page-general-enrollment.component.ts
├── page-general-enrollment.component.html
├── page-general-enrollment.component.scss
├── page-general-enrollment.service.ts
├── page-general-enrollment.service.spec.ts
├── index.ts
├── components/
│   ├── enrollment-header/
│   │   ├── enrollment-header.component.ts
│   │   ├── enrollment-header.component.html
│   │   └── enrollment-header.component.scss
│   ├── enrollment-filters/
│   │   ├── enrollment-filters.component.ts
│   │   ├── enrollment-filters.component.html
│   │   └── enrollment-filters.component.scss
│   ├── sub-event-selection-grid/
│   │   ├── sub-event-selection-grid.component.ts
│   │   ├── sub-event-selection-grid.component.html
│   │   └── sub-event-selection-grid.component.scss
│   ├── sub-event-card/
│   │   ├── sub-event-card.component.ts
│   │   ├── sub-event-card.component.html
│   │   └── sub-event-card.component.scss
│   ├── enrollment-cart/
│   │   ├── enrollment-cart.component.ts
│   │   ├── enrollment-cart.component.html
│   │   └── enrollment-cart.component.scss
│   ├── cart-item/
│   │   ├── cart-item.component.ts
│   │   ├── cart-item.component.html
│   │   └── cart-item.component.scss
│   ├── partner-selection-dialog/
│   │   ├── partner-selection-dialog.component.ts
│   │   ├── partner-selection-dialog.component.html
│   │   └── partner-selection-dialog.component.scss
│   └── enrollment-capacity-indicator/
│       ├── enrollment-capacity-indicator.component.ts
│       ├── enrollment-capacity-indicator.component.html
│       └── enrollment-capacity-indicator.component.scss
└── models/
    ├── enrollment-filters.model.ts
    ├── cart-item.model.ts
    └── validation-error.model.ts
```

---

## Conclusion

This architecture provides a comprehensive, scalable, and accessible solution for multi-discipline tournament enrollment. The design leverages Angular's modern features (signals, standalone components, resource API) while maintaining consistency with the existing codebase patterns.

**Key Benefits**:
1. **User Experience**: Streamlined enrollment process with cart-based workflow
2. **Performance**: Efficient state management and optimistic UI updates
3. **Accessibility**: WCAG 2.1 AA compliant with comprehensive keyboard and screen reader support
4. **Maintainability**: Modular component architecture with clear separation of concerns
5. **Scalability**: Handles tournaments with hundreds of sub-events efficiently

**Next Steps**:
1. Review and approval of architecture
2. Backend API adjustments (if needed)
3. Begin Phase 1 implementation
4. Iterative development with user feedback
