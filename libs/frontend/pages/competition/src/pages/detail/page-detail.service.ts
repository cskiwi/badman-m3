import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { CompetitionEvent } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export class DetailService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    competitionId: new FormControl<string | null>(null),
  });

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private competitionResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.competitionId) {
        return null;
      }

      try {
        const result = await lastValueFrom(this.apollo
          .query<{ competitionEvent: CompetitionEvent }>({
            query: gql`
              query Competition($id: ID!) {
                competitionEvent(id: $id) {
                  id
                  name
                  slug
                  season
                  lastSync
                  openDate
                  closeDate
                  changeOpenDate
                  changeCloseDatePeriod1
                  changeCloseRequestDatePeriod1
                  changeCloseDatePeriod2
                  changeCloseRequestDatePeriod2
                  visualCode
                  teamMatcher
                  official
                  type
                  state
                  country
                  checkEncounterForFilledIn
                  competitionSubEvents {
                    id
                    name
                    eventType
                    level
                    maxLevel
                    minBaseIndex
                    maxBaseIndex
                    lastSync
                    competitionDraws {
                      id
                      name
                      type
                      size
                      risers
                      fallers
                    }
                  }
                }
              }
            `,
            variables: {
              id: params.competitionId,
            },
            context: { signal: abortSignal },
          }));

        if (!result?.data?.competitionEvent) {
          throw new Error('No competition found');
        }
        return result.data.competitionEvent;
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  competition = computed(() => this.competitionResource.value());
  error = computed(() => this.competitionResource.error()?.message || null);
  loading = computed(() => this.competitionResource.isLoading());

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load competition';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }
}
