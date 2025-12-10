import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { TournamentEnrollment, TournamentEvent } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

// GraphQL Fragment
const MY_ENROLLMENT_FRAGMENT = gql`
  fragment MyEnrollmentFields on TournamentEnrollment {
    id
    status
    createdAt
    isGuest
    waitingListPosition
    notes
    tournamentSubEvent {
      id
      name
      eventType
      gameType
      level
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

export class MyEnrollmentsService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    tournamentEventId: new FormControl<string | null>(null),
  });

  // Loading/error states
  cancelling = signal(false);
  cancelError = signal<string | null>(null);

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private dataResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.tournamentEventId) {
        return null;
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{
            tournamentEvent: TournamentEvent;
            myTournamentEnrollments: TournamentEnrollment[];
          }>({
            query: gql`
              ${MY_ENROLLMENT_FRAGMENT}
              query MyEnrollments($id: ID!, $tournamentEventId: ID!) {
                tournamentEvent(id: $id) {
                  id
                  name
                  slug
                  firstDay
                  phase
                  enrollmentOpenDate
                  enrollmentCloseDate
                  tournamentSubEvents {
                    id
                    name
                    eventType
                    gameType
                    level
                  }
                }
                myTournamentEnrollments(tournamentEventId: $tournamentEventId) {
                  ...MyEnrollmentFields
                }
              }
            `,
            variables: {
              id: params.tournamentEventId,
              tournamentEventId: params.tournamentEventId,
            },
            context: { signal: abortSignal },
            fetchPolicy: 'network-only',
          }),
        );

        if (!result?.data.tournamentEvent) {
          throw new Error('Tournament not found');
        }

        return {
          tournament: result.data.tournamentEvent,
          enrollments: result.data.myTournamentEnrollments ?? [],
        };
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  data = computed(() => this.dataResource.value());
  tournament = computed(() => this.data()?.tournament);
  enrollments = computed(() => this.data()?.enrollments ?? []);
  error = computed(() => this.dataResource.error()?.message || null);
  loading = computed(() => this.dataResource.isLoading());

  // Derived computed values
  isEnrollmentOpen = computed(() => this.tournament()?.phase === 'ENROLLMENT_OPEN');

  // Group enrollments by status
  confirmedEnrollments = computed(() =>
    this.enrollments().filter((e) => e.status === 'CONFIRMED'),
  );
  pendingEnrollments = computed(() =>
    this.enrollments().filter((e) => e.status === 'PENDING'),
  );
  waitingListEnrollments = computed(() =>
    this.enrollments().filter((e) => e.status === 'WAITING_LIST'),
  );

  // Get sub-events the user is NOT enrolled in
  availableSubEvents = computed(() => {
    const tournament = this.tournament();
    const enrollments = this.enrollments();
    if (!tournament?.tournamentSubEvents) return [];

    const enrolledSubEventIds = new Set(enrollments.map((e) => e.tournamentSubEventId));
    return tournament.tournamentSubEvents.filter((se) => !enrolledSubEventIds.has(se.id));
  });

  // Cancel an enrollment
  async cancelEnrollment(enrollmentId: string): Promise<boolean> {
    this.cancelling.set(true);
    this.cancelError.set(null);

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

      // Refetch to update the list
      this.dataResource.reload();

      return true;
    } catch (err: any) {
      const message = err?.graphQLErrors?.[0]?.message || err?.message || 'Failed to cancel enrollment';
      this.cancelError.set(message);
      return false;
    } finally {
      this.cancelling.set(false);
    }
  }

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404 && err.url) {
      return 'Tournament not found';
    }
    return err.statusText || 'An error occurred';
  }
}
