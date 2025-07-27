import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { CompetitionEvent, CompetitionSubEvent, CompetitionDraw } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export class DrawsService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    competitionId: new FormControl<string | null>(null),
    subEventId: new FormControl<string | null>(null),
    drawId: new FormControl<string | null>(null),
  });

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private dataResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.competitionId || !params.subEventId || !params.drawId) {
        return null;
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ competitionEvent: CompetitionEvent; competitionSubEvent: CompetitionSubEvent; competitionDraw: CompetitionDraw }>({
            query: gql`
              query CompetitionDrawDetail($competitionId: ID!, $subEventId: ID!, $drawId: ID!) {
                competitionEvent(id: $competitionId) {
                  id
                  name
                  slug
                  season
                }
                competitionSubEvent(id: $subEventId) {
                  id
                  name
                  eventType
                  level
                  maxLevel
                }
                competitionDraw(id: $drawId) {
                  id
                  name
                  type
                  size
                  risers
                  fallers
                  visualCode
                  competitionEncounters {
                    id
                    date
                    homeTeam {
                      id
                      name
                      abbreviation
                    }
                    awayTeam {
                      id
                      name
                      abbreviation
                    }
                    homeScore
                    awayScore
                  }
                }
              }
            `,
            variables: {
              competitionId: params.competitionId,
              subEventId: params.subEventId,
              drawId: params.drawId,
            },
            context: { signal: abortSignal },
          }),
        );

        if (!result?.data.competitionEvent || !result?.data.competitionSubEvent || !result?.data.competitionDraw) {
          throw new Error('No competition, sub event, or draw found');
        }

        return {
          competition: result.data.competitionEvent,
          subEvent: result.data.competitionSubEvent,
          draw: result.data.competitionDraw,
        };
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  competition = computed(() => this.dataResource.value()?.competition);
  subEvent = computed(() => this.dataResource.value()?.subEvent);
  draw = computed(() => this.dataResource.value()?.draw);
  encounters = computed(() => this.dataResource.value()?.draw?.competitionEncounters ?? []);
  error = computed(() => this.dataResource.error()?.message || null);
  loading = computed(() => this.dataResource.isLoading());

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load competition draws';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }
}
