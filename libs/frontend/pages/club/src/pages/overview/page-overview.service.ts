import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Club } from '@app/models';
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

  private clubsResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params) {
        return [];
      }

      try {
        const result = await lastValueFrom(this.apollo
          .query<{ clubs: Club[] }>({
            query: gql`
              query Clubs($args: ClubArgs) {
                clubs(args: $args) {
                  id
                  clubId
                  name
                  slug
                }
              }
            `,
            variables: {
              args: { where: this._clubSearchWhere(params.query) },
            },
            context: { signal: abortSignal },
          }));

        if (!result?.data.clubs) {
          throw new Error('No clubs found');
        }
        return result.data.clubs;
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  clubs = computed(() => this.clubsResource.value() ?? []);
  error = computed(() => this.clubsResource.error()?.message || null);
  loading = computed(() => this.clubsResource.isLoading());

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load clubs';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }

  private _clubSearchWhere(query: string | null | undefined) {
    const parts = query
      ?.toLowerCase()
      .replace(/[;\\\\/:*?"<>|&',]/, ' ')
      .split(' ')
      .map((part) => part.trim());
    const queries: unknown[] = [
      {
        clubId: { ne: null },
      },
    ];

    for (const part of parts ?? []) {
      if (part.length < 1) continue;

      const possibleClubId = parseInt(part);

      if (!isNaN(possibleClubId)) {
        queries.push({ clubId: possibleClubId });
      }
      queries.push({ fullName: { ilike: `%${part}%` } });
    }

    if (queries.length === 0) {
      return;
    }

    return queries;
  }
}
