import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { CompetitionEvent } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { debounceTime } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';

export class OverviewService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    query: new FormControl(undefined),
  });

  // Convert form to signal for resource with debounce
  private filterSignal = toSignal(this.filter.valueChanges.pipe(debounceTime(300)));

  private competitionsResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params) {
        return [];
      }

      try {
        const result = await lastValueFrom(this.apollo
          .query<{ competitionEvents: CompetitionEvent[] }>({
            query: gql`
              query CompetitionsOverview($args: CompetitionEventArgs) {
                competitionEvents(args: $args) {
                  id
                  name
                  slug
                }
              }
            `,
            variables: {
              args: { where: this._competitionSearchWhere(params.query) },
            },
            context: { signal: abortSignal },
          }));

        if (!result?.data.competitionEvents) {
          throw new Error('No competitions found');
        }
        return result.data.competitionEvents;
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  competitions = computed(() => this.competitionsResource.value() ?? []);
  error = computed(() => this.competitionsResource.error()?.message || null);
  loading = computed(() => this.competitionsResource.isLoading());

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load competitions';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }

  private _competitionSearchWhere(query: string | null | undefined) {
    const parts = query
      ?.toLowerCase()
      .replace(/[;\\\\/:*?"<>|&',]/, ' ')
      .split(' ')
      .map((part) => part.trim());
    const queries: unknown[] = [];

    for (const part of parts ?? []) {
      if (part.length < 1) continue;
      queries.push({ fullName: { ilike: `%${part}%` } });
    }

    if (queries.length === 0) {
      return;
    }

    return queries;
  }
}
