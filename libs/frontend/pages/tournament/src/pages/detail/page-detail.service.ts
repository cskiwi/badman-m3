import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { TournamentEvent } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export class DetailService {
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
              query Tournament($id: ID!, $args: TournamentSubEventArgs) {
                tournamentEvent(id: $id) {
                  id
                  name
                  slug
                  tournamentNumber
                  firstDay
                  lastSync
                  openDate
                  closeDate
                  dates
                  visualCode
                  official
                  state
                  country
                  tournamentSubEvents(args: $args) {
                    id
                    name
                    eventType
                    gameType
                    minLevel
                    maxLevel
                    visualCode
                    lastSync
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
              args: {
                order: {
                  minLevel: 'ASC',
                },
              },
            },
            context: { signal: abortSignal },
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

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load tournament';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }
}
