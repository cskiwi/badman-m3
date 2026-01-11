import { Injectable, computed, signal, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import type { TournamentSubEvent, RankingLastPlace, Player } from '@app/models';
import { SsrCookieService } from 'ngx-cookie-service-ssr';

export interface CartItem {
  subEventId: string;
  subEventName: string;
  eventType: string;
  gameType: string;
  preferredPartnerId?: string;
  notes?: string;
}

export interface Eligibility {
  eligible: boolean;
  reasons: string[];
  hasInvitation: boolean;
  meetsLevelRequirement: boolean;
  isAlreadyEnrolled: boolean;
  hasCapacity: boolean;
  isWithinEnrollmentWindow: boolean;
}

export interface Capacity {
  maxEntries?: number;
  currentEnrollmentCount: number;
  confirmedEnrollmentCount: number;
  availableSpots: number;
  waitingListCount: number;
  isFull: boolean;
  hasWaitingList: boolean;
}

export interface SubEventWithEligibility {
  subEvent: TournamentSubEvent;
  eligibility: Eligibility;
  capacity: Capacity;
}

// GraphQL Queries and Mutations
const GET_MY_RANKING = gql`
  query GetMyRanking {
    me {
      id
      gender
      rankingLastPlaces {
        id
        single
        double
        mix
        singleInactive
        doubleInactive
        mixInactive
        rankingDate
        system {
          id
          name
        }
      }
    }
  }
`;

const GET_AVAILABLE_SUB_EVENTS = gql`
  query GetAvailableSubEvents($tournamentId: ID!, $filters: SubEventFilters) {
    availableSubEvents(tournamentId: $tournamentId, filters: $filters) {
      subEvent {
        id
        name
        eventType
        gameType
        minLevel
        maxLevel
        maxEntries
        currentEnrollmentCount
        confirmedEnrollmentCount
        enrollmentPhase
        enrollmentOpenDate
        enrollmentCloseDate
        waitingListEnabled
        requiresApproval
      }
      eligibility {
        eligible
        reasons
        hasInvitation
        meetsLevelRequirement
        isAlreadyEnrolled
        hasCapacity
        isWithinEnrollmentWindow
      }
      capacity {
        maxEntries
        currentEnrollmentCount
        confirmedEnrollmentCount
        availableSpots
        waitingListCount
        isFull
        hasWaitingList
      }
    }
  }
`;

const GET_ENROLLMENT_CART = gql`
  query GetEnrollmentCart($tournamentId: ID!, $sessionId: String) {
    enrollmentCart(tournamentId: $tournamentId, sessionId: $sessionId) {
      id
      sessionKey
      status
      expiresAt
      totalSubEvents
      items {
        id
        tournamentSubEvent {
          id
          name
          eventType
          gameType
        }
        preferredPartnerId
        preferredPartner {
          id
          firstName
          lastName
        }
        notes
        validationStatus
        validationErrors
      }
    }
  }
`;

const ADD_TO_CART = gql`
  mutation AddToEnrollmentCart($input: AddToCartInput!) {
    addToEnrollmentCart(input: $input) {
      id
      sessionKey
      totalSubEvents
      items {
        id
        tournamentSubEvent {
          id
          name
        }
      }
    }
  }
`;

const REMOVE_FROM_CART = gql`
  mutation RemoveFromEnrollmentCart($cartId: ID!, $subEventIds: [ID!]!) {
    removeFromEnrollmentCart(cartId: $cartId, subEventIds: $subEventIds) {
      id
      totalSubEvents
      items {
        id
      }
    }
  }
`;

const CLEAR_CART = gql`
  mutation ClearEnrollmentCart($cartId: ID!) {
    clearEnrollmentCart(cartId: $cartId)
  }
`;

const SUBMIT_CART = gql`
  mutation SubmitEnrollmentCart($cartId: ID!) {
    submitEnrollmentCart(cartId: $cartId) {
      success
      enrollments {
        id
        status
        tournamentSubEvent {
          id
          name
        }
      }
      errors {
        subEventId
        subEventName
        errorMessage
      }
      partialSuccess
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class PageGeneralEnrollmentService {
  // State signals
  private readonly _tournamentId = signal<string | null>(null);
  private readonly _availableSubEvents = signal<SubEventWithEligibility[]>([]);
  private readonly _cartItems = signal<Map<string, CartItem>>(new Map());
  private readonly _filters = signal({
    eventType: [] as string[],
    gameType: [] as string[],
    level: [] as number[],
    enrollmentStatus: 'AVAILABLE' as 'OPEN' | 'AVAILABLE' | 'ALL',
    searchText: '',
    showOnlyMyLevel: true,
  });
  private readonly _loading = signal(false);
  private readonly _sessionKey = signal<string | null>(null);
  private readonly _userRanking = signal<RankingLastPlace | null>(null);
  private readonly _userGender = signal<'M' | 'F' | null>(null);

  // Computed signals
  readonly tournamentId = this._tournamentId.asReadonly();
  readonly availableSubEvents = this._availableSubEvents.asReadonly();
  readonly cartItems = computed(() => Array.from(this._cartItems().values()));
  readonly cartCount = computed(() => this._cartItems().size);
  readonly filters = this._filters.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly userRanking = this._userRanking.asReadonly();
  readonly userGender = this._userGender.asReadonly();

  // Check if user's ranking matches sub-event level requirements
  private matchesUserLevel(subEvent: TournamentSubEvent): boolean {
    const ranking = this._userRanking();
    if (!ranking || !subEvent.minLevel || !subEvent.maxLevel) {
      return true; // No filtering if no ranking or no level requirements
    }

    // Determine which ranking to use based on event type string
    let userLevel: number | undefined;
    const eventTypeStr = subEvent.eventType?.toString().toUpperCase();

    if (eventTypeStr === 'SINGLE') {
      userLevel = ranking.single;
    } else if (eventTypeStr === 'DOUBLE') {
      userLevel = ranking.double;
    } else if (eventTypeStr === 'MIXED' || eventTypeStr === 'MX') {
      userLevel = ranking.mix;
    }

    if (!userLevel) {
      return true; // No filtering if user doesn't have ranking for this type
    }

    // Check if user's level is within the sub-event's range
    return userLevel >= subEvent.minLevel && userLevel <= subEvent.maxLevel;
  }

  // Filtered sub-events based on current filters
  readonly filteredSubEvents = computed(() => {
    const events = this._availableSubEvents();
    const filters = this._filters();

    const filtered = events.filter((item) => {
      const subEvent = item.subEvent;

      // Event type filter
      if (
        filters.eventType.length > 0 &&
        !filters.eventType.includes(subEvent.eventType || '')
      ) {
        return false;
      }

      // Game type filter
      if (
        filters.gameType.length > 0 &&
        !filters.gameType.includes(subEvent.gameType || '')
      ) {
        return false;
      }

      // Search text filter
      if (
        filters.searchText &&
        !subEvent.name?.toLowerCase().includes(filters.searchText.toLowerCase())
      ) {
        return false;
      }

      // Show only my level filter
      if (filters.showOnlyMyLevel && !this.matchesUserLevel(subEvent)) {
        return false;
      }

      return true;
    });

    // Sort by gender first, then by minLevel (lowest first)
    return filtered.sort((a, b) => {
      const genderA = a.subEvent.gameType || '';
      const genderB = b.subEvent.gameType || '';

      // Sort by gender first
      if (genderA !== genderB) {
        return genderA.localeCompare(genderB);
      }

      // Then sort by minLevel (lowest first)
      const levelA = a.subEvent.minLevel || 0;
      const levelB = b.subEvent.minLevel || 0;
      return levelA - levelB;
    });
  });

  private readonly apollo = inject(Apollo);
  private readonly cookieService = inject(SsrCookieService);

  constructor() {
    // Load session key from cookie
    const stored = this.cookieService.get('enrollment_session_key');
    if (stored) {
      this._sessionKey.set(stored);
    }
  }

  /**
   * Load user's ranking data
   */
  loadUserRanking(): void {
    this.apollo
      .query<{ me: Player }>({
        query: GET_MY_RANKING,
      })
      .subscribe({
        next: (result) => {
          const user = result.data?.me;
          if (user) {
            this._userGender.set(user.gender || null);

            // Get the most recent ranking
            if (user.rankingLastPlaces && user.rankingLastPlaces.length > 0) {
              const mostRecent = user.rankingLastPlaces.reduce((prev, current) => {
                return new Date(current.rankingDate!) > new Date(prev.rankingDate!) ? current : prev;
              });
              this._userRanking.set(mostRecent);
            }
          }
        },
        error: (error) => {
          console.error('Failed to load user ranking:', error);
        },
      });
  }

  /**
   * Initialize with tournament ID
   */
  init(tournamentId: string): void {
    this._tournamentId.set(tournamentId);
    this.loadUserRanking();
    this.loadAvailableSubEvents();
    this.loadCart();
  }

  /**
   * Load available sub-events
   */
  loadAvailableSubEvents(): void {
    const tournamentId = this._tournamentId();
    if (!tournamentId) return;

    this._loading.set(true);

    // Create a copy of filters without showOnlyMyLevel (client-side only)
    const { showOnlyMyLevel, ...backendFilters } = this._filters();

    this.apollo
      .query<{ availableSubEvents: SubEventWithEligibility[] }>({
        query: GET_AVAILABLE_SUB_EVENTS,
        variables: {
          tournamentId,
          filters: backendFilters,
        },
      })
      .subscribe({
        next: (result) => {
          this._availableSubEvents.set((result.data?.availableSubEvents as SubEventWithEligibility[]) || []);
          this._loading.set(false);
        },
        error: (error) => {
          console.error('Failed to load sub-events:', error);
          this._loading.set(false);
        },
      });
  }

  /**
   * Load cart
   */
  loadCart(): void {
    const tournamentId = this._tournamentId();
    if (!tournamentId) return;

    this.apollo
      .query<{ enrollmentCart: { sessionKey?: string; items?: Array<{ tournamentSubEvent: TournamentSubEvent; preferredPartnerId?: string; notes?: string }> } | null }>({
        query: GET_ENROLLMENT_CART,
        variables: {
          tournamentId,
          sessionId: this._sessionKey() || undefined,
        },
      })
      .subscribe({
        next: (result) => {
          const cart = result.data?.enrollmentCart;
          if (cart) {
            // Store session key
            if (cart.sessionKey) {
              this._sessionKey.set(cart.sessionKey);
              this.cookieService.set('enrollment_session_key',cart.sessionKey);
            }

            // Load cart items
            const items = new Map<string, CartItem>();
            cart.items?.forEach((item) => {
              items.set(item.tournamentSubEvent.id!, {
                subEventId: item.tournamentSubEvent.id!,
                subEventName: item.tournamentSubEvent.name!,
                eventType: item.tournamentSubEvent.eventType || '',
                gameType: item.tournamentSubEvent.gameType || '',
                preferredPartnerId: item.preferredPartnerId,
                notes: item.notes,
              });
            });
            this._cartItems.set(items);
          }
        },
        error: (error) => {
          console.error('Failed to load cart:', error);
        },
      });
  }

  /**
   * Add item to cart
   */
  addToCart(subEvent: TournamentSubEvent, preferredPartnerId?: string, notes?: string): void {
    const tournamentId = this._tournamentId();
    if (!tournamentId) return;

    this.apollo
      .mutate<{ addToEnrollmentCart: { sessionKey?: string } }>({
        mutation: ADD_TO_CART,
        variables: {
          input: {
            tournamentId,
            items: [
              {
                subEventId: subEvent.id!,
                preferredPartnerId,
                notes,
              },
            ],
            sessionId: this._sessionKey() || undefined,
          },
        },
      })
      .subscribe({
        next: (result) => {
          const cart = result.data?.addToEnrollmentCart;
          if (cart?.sessionKey) {
            this._sessionKey.set(cart.sessionKey);
            this.cookieService.set('enrollment_session_key',cart.sessionKey);
          }

          // Update local state
          const items = new Map(this._cartItems());
          items.set(subEvent.id!, {
            subEventId: subEvent.id!,
            subEventName: subEvent.name!,
            eventType: subEvent.eventType || '',
            gameType: subEvent.gameType || '',
            preferredPartnerId,
            notes,
          });
          this._cartItems.set(items);
        },
        error: (error) => {
          console.error('Failed to add to cart:', error);
        },
      });
  }

  /**
   * Remove item from cart
   */
  removeFromCart(subEventId: string, cartId: string): void {
    this.apollo
      .mutate({
        mutation: REMOVE_FROM_CART,
        variables: {
          cartId,
          subEventIds: [subEventId],
        },
      })
      .subscribe({
        next: () => {
          // Update local state
          const items = new Map(this._cartItems());
          items.delete(subEventId);
          this._cartItems.set(items);
        },
        error: (error) => {
          console.error('Failed to remove from cart:', error);
        },
      });
  }

  /**
   * Clear cart
   */
  clearCart(cartId: string): void {
    this.apollo
      .mutate({
        mutation: CLEAR_CART,
        variables: { cartId },
      })
      .subscribe({
        next: () => {
          this._cartItems.set(new Map());
        },
        error: (error) => {
          console.error('Failed to clear cart:', error);
        },
      });
  }

  /**
   * Submit cart
   */
  submitCart(cartId: string): Observable<{ success: boolean; enrollments: Array<unknown>; errors: Array<unknown>; partialSuccess: boolean }> {
    return this.apollo
      .mutate<{ submitEnrollmentCart: { success: boolean; enrollments: Array<unknown>; errors: Array<unknown>; partialSuccess: boolean } }>({
        mutation: SUBMIT_CART,
        variables: { cartId },
      })
      .pipe(
        map((result) => {
          if (result.data?.submitEnrollmentCart.success) {
            this._cartItems.set(new Map());
            this.cookieService.delete('enrollment_session_key');
          }
          return result.data!.submitEnrollmentCart;
        }),
      );
  }

  /**
   * Update filters
   */
  updateFilters(filters: { eventType: string[]; gameType: string[]; level: number[]; enrollmentStatus: 'OPEN' | 'AVAILABLE' | 'ALL'; searchText: string; showOnlyMyLevel: boolean }): void {
    this._filters.set(filters);
    this.loadAvailableSubEvents();
  }

  /**
   * Check if sub-event is in cart
   */
  isInCart(subEventId: string): boolean {
    return this._cartItems().has(subEventId);
  }

  /**
   * Toggle sub-event in cart
   */
  toggleInCart(
    subEvent: TournamentSubEvent,
    cartId?: string,
    preferredPartnerId?: string,
    notes?: string,
  ): void {
    if (this.isInCart(subEvent.id!)) {
      if (cartId) {
        this.removeFromCart(subEvent.id!, cartId);
      }
    } else {
      this.addToCart(subEvent, preferredPartnerId, notes);
    }
  }
}
