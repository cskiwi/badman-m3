import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { TournamentEvent } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export class AdminService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    tournamentId: new FormControl<string | null>(null),
  });

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private tournamentResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.tournamentId) {
        return null;
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ tournamentEvent: TournamentEvent }>({
            query: gql`
              query TournamentAdmin($id: ID!) {
                tournamentEvent(id: $id) {
                  id
                  name
                  slug
                  tournamentNumber
                  firstDay
                  openDate
                  closeDate
                  dates
                  visualCode
                  official
                  state
                  country
                  phase
                  enrollmentOpenDate
                  enrollmentCloseDate
                  allowGuestEnrollments
                  schedulePublished
                  clubId
                  club {
                    id
                    name
                  }
                  tournamentSubEvents {
                    id
                    name
                    eventType
                    gameType
                    minLevel
                    maxLevel
                    visualCode
                    maxEntries
                    waitingListEnabled
                    drawTournaments {
                      id
                      name
                      type
                      size
                    }
                  }
                }
              }
            `,
            variables: {
              id: params.tournamentId,
            },
            context: { signal: abortSignal },
            fetchPolicy: 'network-only',
          }),
        );

        if (!result?.data?.tournamentEvent) {
          throw new Error('No tournament found');
        }
        return result.data.tournamentEvent;
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  tournament = computed(() => this.tournamentResource.value());
  error = computed(() => this.tournamentResource.error()?.message || null);
  loading = computed(() => this.tournamentResource.isLoading());

  // Refetch tournament data
  refetch() {
    this.tournamentResource.reload();
  }

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404 && err.url) {
      return 'Failed to load tournament';
    }
    return err.statusText || 'An error occurred';
  }
}
