import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { TournamentSubEvent, TournamentEnrollment, Player } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

// GraphQL Fragments
const ENROLLMENT_FRAGMENT = gql`
  fragment EnrollmentFields on TournamentEnrollment {
    id
    status
    createdAt
    isGuest
    guestName
    guestEmail
    waitingListPosition
    notes
    player {
      id
      fullName
      memberId
    }
    preferredPartner {
      id
      fullName
      memberId
    }
    confirmedPartner {
      id
      fullName
      memberId
    }
  }
`;

export class EnrollmentService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    subEventId: new FormControl<string | null>(null),
  });

  // Loading/error states for mutations
  enrolling = signal(false);
  enrollError = signal<string | null>(null);

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private subEventResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.subEventId) {
        return null;
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{
            tournamentSubEvent: TournamentSubEvent & {
              tournamentEvent: { id: string; name: string; phase: string; allowGuestEnrollments: boolean };
              enrollments: TournamentEnrollment[];
              confirmedEnrollmentCount: number;
              pendingEnrollmentCount: number;
              waitingListCount: number;
            };
          }>({
            query: gql`
              ${ENROLLMENT_FRAGMENT}
              query SubEventEnrollment($id: ID!) {
                tournamentSubEvent(id: $id) {
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
                  tournamentEvent {
                    id
                    name
                    phase
                    allowGuestEnrollments
                  }
                  enrollments {
                    ...EnrollmentFields
                  }
                }
              }
            `,
            variables: { id: params.subEventId },
            context: { signal: abortSignal },
            fetchPolicy: 'network-only',
          }),
        );

        if (!result?.data?.tournamentSubEvent) {
          throw new Error('Sub-event not found');
        }
        return result.data.tournamentSubEvent;
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  subEvent = computed(() => this.subEventResource.value());
  error = computed(() => this.subEventResource.error()?.message || null);
  loading = computed(() => this.subEventResource.isLoading());

  // Derived computed values
  enrollments = computed(() => this.subEvent()?.enrollments ?? []);
  tournamentEvent = computed(() => this.subEvent()?.tournamentEvent);
  isEnrollmentOpen = computed(() => this.tournamentEvent()?.phase === 'ENROLLMENT_OPEN');
  allowsGuests = computed(() => this.tournamentEvent()?.allowGuestEnrollments ?? false);
  isDoubles = computed(() => {
    const gameType = this.subEvent()?.gameType;
    return gameType === 'D' || gameType === 'MX';
  });
  isFull = computed(() => {
    const subEvent = this.subEvent();
    if (!subEvent?.maxEntries) return false;
    const confirmed = subEvent.confirmedEnrollmentCount ?? 0;
    // For doubles, each confirmed pair = 2 enrollments but 1 entry
    const isDoubles = this.isDoubles();
    const effectiveEntries = isDoubles ? Math.ceil(confirmed / 2) : confirmed;
    return effectiveEntries >= subEvent.maxEntries;
  });

  // Get enrollments looking for partner (for doubles)
  lookingForPartner = computed(() =>
    this.enrollments().filter(
      (e) => e.status === 'PENDING' && !e.confirmedPartnerId && !e.isGuest,
    ),
  );

  // Get confirmed pairs
  confirmedEnrollments = computed(() =>
    this.enrollments().filter((e) => e.status === 'CONFIRMED'),
  );

  // Get waiting list
  waitingListEnrollments = computed(() =>
    this.enrollments()
      .filter((e) => e.status === 'WAITING_LIST')
      .sort((a, b) => (a.waitingListPosition ?? 999) - (b.waitingListPosition ?? 999)),
  );

  // Enroll current player
  async enrollPlayer(preferredPartnerId?: string, notes?: string): Promise<TournamentEnrollment | null> {
    const subEventId = this.filter.get('subEventId')?.value;
    if (!subEventId) return null;

    this.enrolling.set(true);
    this.enrollError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ enrollInTournament: TournamentEnrollment }>({
          mutation: gql`
            ${ENROLLMENT_FRAGMENT}
            mutation EnrollInTournament($input: EnrollPlayerInput!) {
              enrollInTournament(input: $input) {
                ...EnrollmentFields
              }
            }
          `,
          variables: {
            input: {
              tournamentSubEventId: subEventId,
              preferredPartnerId,
              notes,
            },
          },
        }),
      );

      // Refetch the sub-event to update enrollments
      this.subEventResource.reload();

      return result.data?.enrollInTournament ?? null;
    } catch (err: any) {
      const message = err?.graphQLErrors?.[0]?.message || err?.message || 'Failed to enroll';
      this.enrollError.set(message);
      return null;
    } finally {
      this.enrolling.set(false);
    }
  }

  // Enroll a guest
  async enrollGuest(
    guestName: string,
    guestEmail: string,
    guestPhone?: string,
    preferredPartnerId?: string,
    notes?: string,
  ): Promise<TournamentEnrollment | null> {
    const subEventId = this.filter.get('subEventId')?.value;
    if (!subEventId) return null;

    this.enrolling.set(true);
    this.enrollError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ enrollGuest: TournamentEnrollment }>({
          mutation: gql`
            ${ENROLLMENT_FRAGMENT}
            mutation EnrollGuest($input: EnrollGuestInput!) {
              enrollGuest(input: $input) {
                ...EnrollmentFields
              }
            }
          `,
          variables: {
            input: {
              tournamentSubEventId: subEventId,
              guestName,
              guestEmail,
              guestPhone,
              preferredPartnerId,
              notes,
            },
          },
        }),
      );

      // Refetch the sub-event to update enrollments
      this.subEventResource.reload();

      return result.data?.enrollGuest ?? null;
    } catch (err: any) {
      const message = err?.graphQLErrors?.[0]?.message || err?.message || 'Failed to enroll guest';
      this.enrollError.set(message);
      return null;
    } finally {
      this.enrolling.set(false);
    }
  }

  // Cancel an enrollment
  async cancelEnrollment(enrollmentId: string): Promise<boolean> {
    this.enrolling.set(true);
    this.enrollError.set(null);

    try {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation CancelEnrollment($enrollmentId: ID!) {
              cancelEnrollment(enrollmentId: $enrollmentId) {
                id
                status
              }
            }
          `,
          variables: { enrollmentId },
        }),
      );

      // Refetch the sub-event to update enrollments
      this.subEventResource.reload();

      return true;
    } catch (err: any) {
      const message = err?.graphQLErrors?.[0]?.message || err?.message || 'Failed to cancel enrollment';
      this.enrollError.set(message);
      return false;
    } finally {
      this.enrolling.set(false);
    }
  }

  // Search for players (for partner selection)
  async searchPlayers(query: string): Promise<Player[]> {
    if (!query || query.length < 2) return [];

    try {
      const result = await lastValueFrom(
        this.apollo.query<{ players: Player[] }>({
          query: gql`
            query SearchPlayers($args: PlayerArgs) {
              players(args: $args) {
                id
                fullName
                memberId
              }
            }
          `,
          variables: {
            args: {
              where: {
                fullName: { $iLike: `%${query}%` },
              },
              take: 10,
            },
          },
        }),
      );

      return result.data?.players ?? [];
    } catch {
      return [];
    }
  }

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404 && err.url) {
      return 'Sub-event not found';
    }
    return err.statusText || 'An error occurred';
  }
}
