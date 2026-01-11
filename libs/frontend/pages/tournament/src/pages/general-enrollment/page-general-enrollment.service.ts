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

/**
 * TournamentSubEvent with client-side calculated properties
 * Properties prefixed with _ are computed locally, not from backend
 */
export interface SubEventWithCalculations extends TournamentSubEvent {
  _availableSpots: number; // maxEntries - currentEnrollmentCount
  _isEnrollmentOpen: boolean; // check enrollmentPhase and dates
  _isAlreadyEnrolled: boolean; // check if in user's enrollments
  _isEligible: boolean; // all eligibility checks combined
}

// Using field resolvers on TournamentSubEvent:
// - enrollmentEligibility: Eligibility check computed on backend
// - availableSpots: Capacity info computed on backend
// - isEnrollmentOpen: Open status computed on backend
// - waitingListCount: Waiting list count computed on backend

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
  query GetTournamentSubEvents($args: TournamentSubEventArgs) {
    tournamentSubEvents(args: $args) {
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
      waitingListCount
    }
  }
`;

// Query to get user's enrollments for this tournament
const GET_USER_ENROLLMENTS = gql`
  query GetUserEnrollments($args: TournamentEnrollmentArgs) {
    tournamentEnrollments(args: $args) {
      id
      tournamentSubEventId
      status
    }
  }
`;

const GET_ENROLLMENT_CART = gql`
  query GetEnrollmentSession($args: EnrollmentSessionArgs) {
    enrollmentSession(args: $args) {
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
      id
      status
      tournamentSubEventId
      tournamentSubEvent {
        id
        name
      }
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class PageGeneralEnrollmentService {
  // State signals
  private readonly _tournamentId = signal<string | null>(null);
  private readonly _availableSubEvents = signal<TournamentSubEvent[]>([]);
  private readonly _userEnrollments = signal<Set<string>>(new Set()); // Set of subEventIds user is enrolled in
  private readonly _cartItems = signal<Map<string, CartItem>>(new Map());
  private readonly _cartId = signal<string | null>(null);
  private readonly _filters = signal({
    eventType: [] as string[],
    gameType: [] as string[],
    level: [] as number[],
    enrollmentStatus: 'ALL' as 'OPEN' | 'AVAILABLE' | 'ALL',
    searchText: '',
    showOnlyMyLevel: false,
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
  readonly cartId = this._cartId.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly userRanking = this._userRanking.asReadonly();
  readonly userGender = this._userGender.asReadonly();

  // ===================================================================
  // Client-side calculations (moved from backend field resolvers)
  // ===================================================================

  /**
   * Calculate available spots
   * maxEntries - currentEnrollmentCount (null/undefined maxEntries = unlimited)
   */
  private getAvailableSpots(subEvent: TournamentSubEvent): number {
    if (!subEvent.maxEntries) {
      return -1; // Unlimited
    }
    return Math.max(0, subEvent.maxEntries - (subEvent.currentEnrollmentCount || 0));
  }

  /**
   * Check if enrollment is currently open
   * Based on date window only (enrollmentPhase is managed at tournament level)
   */
  private isEnrollmentOpen(subEvent: TournamentSubEvent): boolean {
    const now = new Date();

    // Check per-event dates (if specified)
    if (subEvent.enrollmentOpenDate && now < new Date(subEvent.enrollmentOpenDate)) {
      return false;
    }
    if (subEvent.enrollmentCloseDate && now > new Date(subEvent.enrollmentCloseDate)) {
      return false;
    }

    // If no dates are set, consider it open (tournament level controls this)
    return true;
  }

  /**
   * Check if user is already enrolled in this sub-event
   * Uses the enrollments set loaded separately
   */
  private isAlreadyEnrolled(subEventId: string): boolean {
    return this._userEnrollments().has(subEventId);
  }

  /**
   * Check if user meets level requirements for sub-event
   */
  private meetsLevelRequirement(subEvent: TournamentSubEvent): boolean {
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

  /**
   * Check if user's ranking matches sub-event level requirements
   * Used for "show only my level" filter
   */
  private matchesUserLevel(subEvent: TournamentSubEvent): boolean {
    return this.meetsLevelRequirement(subEvent);
  }

  /**
   * Check if user is eligible to enroll
   * Combines all eligibility checks
   */
  private isEligible(subEvent: TournamentSubEvent): boolean {
    // Must not already be enrolled
    if (this.isAlreadyEnrolled(subEvent.id!)) {
      return false;
    }

    // Must be within enrollment window
    if (!this.isEnrollmentOpen(subEvent)) {
      return false;
    }

    // Must have capacity or waiting list enabled
    const availableSpots = this.getAvailableSpots(subEvent);
    if (availableSpots === 0 && !subEvent.waitingListEnabled) {
      return false;
    }

    // Must meet level requirements
    if (!this.meetsLevelRequirement(subEvent)) {
      return false;
    }

    return true;
  }

  // Filtered sub-events with client-side calculated properties
  readonly filteredSubEvents = computed<SubEventWithCalculations[]>(() => {
    const filtered = this.getFilteredSubEvents();

    // Add client-side calculated properties to each sub-event
    return filtered.map(subEvent => ({
      ...subEvent,
      // Client-side calculations
      _availableSpots: this.getAvailableSpots(subEvent),
      _isEnrollmentOpen: this.isEnrollmentOpen(subEvent),
      _isAlreadyEnrolled: this.isAlreadyEnrolled(subEvent.id!),
      _isEligible: this.isEligible(subEvent),
    } as SubEventWithCalculations));
  });

  // Helper method for filtering logic
  private getFilteredSubEvents(): TournamentSubEvent[] {
    const events = this._availableSubEvents();
    const filters = this._filters();

    const filtered = events.filter((subEvent) => {
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

      // Level filter
      if (filters.level.length > 0) {
        const subEventMinLevel = subEvent.minLevel || 0;
        const subEventMaxLevel = subEvent.maxLevel || 12;
        const hasOverlap = filters.level.some(
          level => level >= subEventMinLevel && level <= subEventMaxLevel
        );
        if (!hasOverlap) {
          return false;
        }
      }

      // Enrollment status filter
      if (filters.enrollmentStatus !== 'ALL') {
        if (filters.enrollmentStatus === 'OPEN') {
          // Only show sub-events that are currently open
          if (!this.isEnrollmentOpen(subEvent)) {
            return false;
          }
        } else if (filters.enrollmentStatus === 'AVAILABLE') {
          // Show sub-events that user is eligible for
          if (!this.isEligible(subEvent)) {
            return false;
          }
        }
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

    // Sort by game type first, then by minLevel (lowest first)
    return filtered.sort((a, b) => {
      const gameTypeA = a.gameType || '';
      const gameTypeB = b.gameType || '';

      // Sort by game type first
      if (gameTypeA !== gameTypeB) {
        return gameTypeA.localeCompare(gameTypeB);
      }

      // Then sort by minLevel (lowest first)
      const levelA = a.minLevel || 0;
      const levelB = b.minLevel || 0;
      return levelA - levelB;
    });
  }

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
    this.loadAvailableSubEvents(); // This will trigger loadUserEnrollments() after sub-events are loaded
    this.loadCart();
  }

  /**
   * Load user's enrollments for this tournament
   * Used client-side to check if already enrolled
   *
   * Note: Since TournamentEnrollmentWhereInput doesn't support nested queries,
   * we rely on the available sub-events being loaded first, then filter enrollments by those IDs
   */
  loadUserEnrollments(): void {
    const tournamentId = this._tournamentId();
    const subEvents = this._availableSubEvents();

    if (!tournamentId || subEvents.length === 0) return;

    // Extract sub-event IDs from loaded sub-events
    const subEventIds = subEvents.map(se => se.id).filter((id): id is string => id !== undefined);

    if (subEventIds.length === 0) return;

    this.apollo
      .query<{ tournamentEnrollments: Array<{ id: string; tournamentSubEventId: string; status: string }> }>({
        query: GET_USER_ENROLLMENTS,
        variables: {
          args: {
            where: [{
              tournamentSubEventId: {
                in: subEventIds,
              },
            }],
          },
        },
      })
      .subscribe({
        next: (result) => {
          const enrolledSubEventIds = new Set(
            result.data?.tournamentEnrollments?.map(e => e.tournamentSubEventId) || []
          );
          this._userEnrollments.set(enrolledSubEventIds);
        },
        error: (error) => {
          console.error('Failed to load user enrollments:', error);
        },
      });
  }

  /**
   * Load available sub-events using standard Args pattern
   */
  loadAvailableSubEvents(): void {
    const tournamentId = this._tournamentId();
    if (!tournamentId) return;

    this._loading.set(true);

    // Use standard tournamentSubEvents query with where filter
    this.apollo
      .query<{ tournamentSubEvents: TournamentSubEvent[] }>({
        query: GET_AVAILABLE_SUB_EVENTS,
        variables: {
          args: {
            where: [{
              eventId: {
                eq: tournamentId,
              },
            }],
          },
        },
      })
      .subscribe({
        next: (result) => {
          this._availableSubEvents.set(result.data?.tournamentSubEvents || []);
          this._loading.set(false);

          // Load user enrollments after sub-events are loaded
          this.loadUserEnrollments();
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

    const sessionKey = this._sessionKey();

    this.apollo
      .query<{ enrollmentSession: { id?: string; sessionKey?: string; items?: Array<{ tournamentSubEvent: TournamentSubEvent; preferredPartnerId?: string; notes?: string }> } | null }>({
        query: GET_ENROLLMENT_CART,
        variables: {
          args: {
            where: [{
              tournamentEventId: {
                eq: tournamentId,
              },
              sessionKey: sessionKey ? { eq: sessionKey } : undefined,
              status: {
                eq: 'PENDING',
              },
            }],
          },
        },
      })
      .subscribe({
        next: (result) => {
          const cart = result.data?.enrollmentSession;
          if (cart) {
            // Store cart ID
            if (cart.id) {
              this._cartId.set(cart.id);
            }

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

    const sessionKey = this._sessionKey();

    this.apollo
      .mutate<{ addToEnrollmentCart: { id?: string; sessionKey?: string } }>({
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
            sessionId: sessionKey || undefined,
          },
        },
        refetchQueries: [
          {
            query: GET_ENROLLMENT_CART,
            variables: {
              args: {
                where: [{
                  tournamentEventId: {
                    eq: tournamentId,
                  },
                  sessionKey: sessionKey ? { eq: sessionKey } : undefined,
                  status: {
                    eq: 'PENDING',
                  },
                }],
              },
            },
          },
        ],
      })
      .subscribe({
        next: (result) => {
          const cart = result.data?.addToEnrollmentCart;
          if (cart) {
            // Store cart ID
            if (cart.id) {
              this._cartId.set(cart.id);
            }

            // Store session key
            if (cart.sessionKey) {
              this._sessionKey.set(cart.sessionKey);
              this.cookieService.set('enrollment_session_key',cart.sessionKey);
            }
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
    const tournamentId = this._tournamentId();
    const sessionKey = this._sessionKey();

    this.apollo
      .mutate({
        mutation: REMOVE_FROM_CART,
        variables: {
          cartId,
          subEventIds: [subEventId],
        },
        refetchQueries: [
          {
            query: GET_ENROLLMENT_CART,
            variables: {
              args: {
                where: [{
                  tournamentEventId: {
                    eq: tournamentId,
                  },
                  sessionKey: sessionKey ? { eq: sessionKey } : undefined,
                  status: {
                    eq: 'PENDING',
                  },
                }],
              },
            },
          },
        ],
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
    const tournamentId = this._tournamentId();
    const sessionKey = this._sessionKey();

    this.apollo
      .mutate({
        mutation: CLEAR_CART,
        variables: { cartId },
        refetchQueries: [
          {
            query: GET_ENROLLMENT_CART,
            variables: {
              args: {
                where: [{
                  tournamentEventId: {
                    eq: tournamentId,
                  },
                  sessionKey: sessionKey ? { eq: sessionKey } : undefined,
                  status: {
                    eq: 'PENDING',
                  },
                }],
              },
            },
          },
        ],
      })
      .subscribe({
        next: () => {
          this._cartItems.set(new Map());
          this._cartId.set(null);
        },
        error: (error) => {
          console.error('Failed to clear cart:', error);
        },
      });
  }

  /**
   * Submit cart - returns array of enrollments
   */
  submitCart(cartId: string): Observable<Array<{ id: string; status: string; tournamentSubEventId: string }>> {
    return this.apollo
      .mutate<{ submitEnrollmentCart: Array<{ id: string; status: string; tournamentSubEventId: string }> }>({
        mutation: SUBMIT_CART,
        variables: { cartId },
      })
      .pipe(
        map((result) => {
          if (result.data?.submitEnrollmentCart) {
            // Clear cart on successful submission
            this._cartItems.set(new Map());
            this._cartId.set(null);
            this.cookieService.delete('enrollment_session_key');
          }
          return result.data?.submitEnrollmentCart || [];
        }),
      );
  }

  /**
   * Update filters
   */
  updateFilters(filters: { eventType: string[]; gameType: string[]; level: number[]; enrollmentStatus: 'OPEN' | 'AVAILABLE' | 'ALL'; searchText: string; showOnlyMyLevel: boolean }): void {
    this._filters.set(filters);
    // Filters are applied client-side in filteredSubEvents computed signal
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
