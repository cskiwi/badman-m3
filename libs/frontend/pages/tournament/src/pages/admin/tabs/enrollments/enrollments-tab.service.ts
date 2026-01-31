import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { TournamentEnrollment } from '@app/models';
import { EnrollmentStatus } from '@app/models-enum';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export class EnrollmentsTabService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    subEventId: new FormControl<string | null>(null),
    status: new FormControl<EnrollmentStatus | null>(null),
    search: new FormControl<string>(''),
  });

  private filterSignal = toSignal(this.filter.valueChanges);

  readonly updating = signal(false);
  readonly updateError = signal<string | null>(null);

  private enrollmentsResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.subEventId) {
        return [];
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ subEventEnrollments: TournamentEnrollment[] }>({
            query: gql`
              query SubEventEnrollments($subEventId: ID!, $status: EnrollmentStatus) {
                subEventEnrollments(subEventId: $subEventId, status: $status) {
                  id
                  status
                  waitingListPosition
                  notes
                  isGuest
                  guestName
                  guestEmail
                  guestPhone
                  createdAt
                  player {
                    id
                    firstName
                    lastName
                    fullName
                    memberId
                  }
                  preferredPartner {
                    id
                    firstName
                    lastName
                    fullName
                  }
                  confirmedPartner {
                    id
                    firstName
                    lastName
                    fullName
                  }
                }
              }
            `,
            variables: {
              subEventId: params.subEventId,
              status: params.status || undefined,
            },
            context: { signal: abortSignal },
            fetchPolicy: 'network-only',
          }),
        );

        return result.data?.subEventEnrollments ?? [];
      } catch {
        return [];
      }
    },
  });

  // Public selectors
  enrollments = computed(() => {
    const enrollments = this.enrollmentsResource.value() ?? [];
    const search = this.filter.get('search')?.value?.toLowerCase() ?? '';

    if (!search) {
      return enrollments;
    }

    return enrollments.filter((e) => {
      const playerName = e.player?.fullName?.toLowerCase() ?? '';
      const guestName = e.guestName?.toLowerCase() ?? '';
      const partnerName = e.confirmedPartner?.fullName?.toLowerCase() ?? '';
      return playerName.includes(search) || guestName.includes(search) || partnerName.includes(search);
    });
  });

  loading = computed(() => this.enrollmentsResource.isLoading());
  error = computed(() => this.enrollmentsResource.error()?.message || null);

  // Stats
  stats = computed(() => {
    const all = this.enrollmentsResource.value() ?? [];
    return {
      total: all.length,
      confirmed: all.filter((e) => e.status === EnrollmentStatus.CONFIRMED).length,
      pending: all.filter((e) => e.status === EnrollmentStatus.PENDING).length,
      waitingList: all.filter((e) => e.status === EnrollmentStatus.WAITING_LIST).length,
      cancelled: all.filter((e) => e.status === EnrollmentStatus.CANCELLED || e.status === EnrollmentStatus.WITHDRAWN)
        .length,
    };
  });

  refetch() {
    this.enrollmentsResource.reload();
  }

  async cancelEnrollment(enrollmentId: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ cancelEnrollment: TournamentEnrollment }>({
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

      if (result.data?.cancelEnrollment) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to cancel enrollment');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async promoteFromWaitingList(enrollmentId: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ promoteFromWaitingList: TournamentEnrollment }>({
          mutation: gql`
            mutation PromoteFromWaitingList($enrollmentId: ID!) {
              promoteFromWaitingList(enrollmentId: $enrollmentId) {
                id
                status
                waitingListPosition
              }
            }
          `,
          variables: { enrollmentId },
        }),
      );

      if (result.data?.promoteFromWaitingList) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to promote from waiting list');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async updateEnrollment(enrollmentId: string, data: { preferredPartnerId?: string; notes?: string }): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ updateEnrollment: TournamentEnrollment }>({
          mutation: gql`
            mutation UpdateEnrollment($enrollmentId: ID!, $input: UpdateEnrollmentInput!) {
              updateEnrollment(enrollmentId: $enrollmentId, input: $input) {
                id
                status
                preferredPartner {
                  id
                  fullName
                }
                notes
              }
            }
          `,
          variables: {
            enrollmentId,
            input: data,
          },
        }),
      );

      if (result.data?.updateEnrollment) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to update enrollment');
      return false;
    } finally {
      this.updating.set(false);
    }
  }
}
