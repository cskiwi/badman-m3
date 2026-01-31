import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Player, TournamentCheckIn, TournamentEnrollment } from '@app/models';
import { CheckInStatus } from '@app/models-enum';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export interface CheckInStats {
  total: number;
  checkedIn: number;
  pending: number;
  noShow: number;
  checkInRate: number;
}

export interface BulkCheckInResult {
  successCount: number;
  failedCount: number;
  failedEnrollmentIds: string[];
}

export interface CheckInWithDetails extends TournamentCheckIn {
  player?: Player;
  enrollment?: TournamentEnrollment;
}

export class CheckinTabService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    tournamentEventId: new FormControl<string | null>(null),
    status: new FormControl<CheckInStatus | null>(null),
    search: new FormControl<string>(''),
  });

  private filterSignal = toSignal(this.filter.valueChanges);

  // Loading and error states
  readonly updating = signal(false);
  readonly updateError = signal<string | null>(null);

  // Check-ins resource
  private checkInsResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.tournamentEventId) {
        return { checkIns: [], stats: null };
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{
            tournamentCheckInList: CheckInWithDetails[];
            checkInStats: CheckInStats;
          }>({
            query: gql`
              query TournamentCheckInData($tournamentEventId: ID!, $status: CheckInStatus) {
                tournamentCheckInList(tournamentEventId: $tournamentEventId, status: $status) {
                  id
                  status
                  checkedInAt
                  notes
                  player {
                    id
                    firstName
                    lastName
                    fullName
                    memberId
                  }
                  enrollment {
                    id
                    isGuest
                    guestName
                    guestEmail
                    tournamentSubEvent {
                      id
                      name
                      gameType
                    }
                  }
                }
                checkInStats(tournamentEventId: $tournamentEventId) {
                  total
                  checkedIn
                  pending
                  noShow
                  checkInRate
                }
              }
            `,
            variables: {
              tournamentEventId: params.tournamentEventId,
              status: params.status ?? undefined,
            },
            context: { signal: abortSignal },
            fetchPolicy: 'network-only',
          }),
        );

        return {
          checkIns: result.data?.tournamentCheckInList ?? [],
          stats: result.data?.checkInStats ?? null,
        };
      } catch {
        return { checkIns: [], stats: null };
      }
    },
  });

  // Public selectors
  checkIns = computed(() => {
    const allCheckIns = this.checkInsResource.value()?.checkIns ?? [];
    const search = this.filter.get('search')?.value?.toLowerCase() ?? '';

    if (!search) {
      return allCheckIns;
    }

    return allCheckIns.filter((c) => {
      const playerName = c.player?.fullName?.toLowerCase() ?? '';
      const guestName = c.enrollment?.guestName?.toLowerCase() ?? '';
      const memberId = c.player?.memberId?.toLowerCase() ?? '';
      return playerName.includes(search) || guestName.includes(search) || memberId.includes(search);
    });
  });

  stats = computed(() => {
    return (
      this.checkInsResource.value()?.stats ?? {
        total: 0,
        checkedIn: 0,
        pending: 0,
        noShow: 0,
        checkInRate: 0,
      }
    );
  });

  loading = computed(() => this.checkInsResource.isLoading());
  error = computed(() => this.checkInsResource.error()?.message || null);

  refetch() {
    this.checkInsResource.reload();
  }

  async initializeCheckIns(tournamentEventId: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ initializeCheckIns: TournamentCheckIn[] }>({
          mutation: gql`
            mutation InitializeCheckIns($tournamentEventId: ID!) {
              initializeCheckIns(tournamentEventId: $tournamentEventId) {
                id
                status
              }
            }
          `,
          variables: { tournamentEventId },
        }),
      );

      if (result.data?.initializeCheckIns) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to initialize check-ins');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async checkInPlayer(tournamentEventId: string, enrollmentId: string, notes?: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ checkInPlayer: TournamentCheckIn }>({
          mutation: gql`
            mutation CheckInPlayer($input: CheckInPlayerInput!) {
              checkInPlayer(input: $input) {
                id
                status
                checkedInAt
              }
            }
          `,
          variables: {
            input: { tournamentEventId, enrollmentId, notes },
          },
        }),
      );

      if (result.data?.checkInPlayer) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to check in player');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async markNoShow(tournamentEventId: string, enrollmentId: string, reason?: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ markNoShow: TournamentCheckIn }>({
          mutation: gql`
            mutation MarkNoShow($input: MarkNoShowInput!) {
              markNoShow(input: $input) {
                id
                status
              }
            }
          `,
          variables: {
            input: { tournamentEventId, enrollmentId, reason },
          },
        }),
      );

      if (result.data?.markNoShow) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to mark no-show');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async undoCheckIn(checkInId: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ undoCheckIn: TournamentCheckIn }>({
          mutation: gql`
            mutation UndoCheckIn($checkInId: ID!) {
              undoCheckIn(checkInId: $checkInId) {
                id
                status
              }
            }
          `,
          variables: { checkInId },
        }),
      );

      if (result.data?.undoCheckIn) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to undo check-in');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async bulkCheckIn(tournamentEventId: string, enrollmentIds: string[]): Promise<BulkCheckInResult | null> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ bulkCheckIn: BulkCheckInResult }>({
          mutation: gql`
            mutation BulkCheckIn($input: BulkCheckInInput!) {
              bulkCheckIn(input: $input) {
                successCount
                failedCount
                failedEnrollmentIds
              }
            }
          `,
          variables: {
            input: { tournamentEventId, enrollmentIds },
          },
        }),
      );

      if (result.data?.bulkCheckIn) {
        this.refetch();
        return result.data.bulkCheckIn;
      }
      return null;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to bulk check-in');
      return null;
    } finally {
      this.updating.set(false);
    }
  }
}
