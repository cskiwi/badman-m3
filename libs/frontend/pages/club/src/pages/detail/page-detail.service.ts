import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Club } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export class DetailService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    clubId: new FormControl<string | null>(null),
  });

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private clubResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId) {
        return null;
      }

      try {
        const result = await lastValueFrom(this.apollo
          .query<{ club: Club }>({
            query: gql`
              query Club($id: ID!) {
                club(id: $id) {
                  id
                  fullName
                  slug
                  clubId
                  teams {
                    id
                    name
                  }
                }
              }
            `,
            variables: {
              id: params.clubId,
            },
            context: { signal: abortSignal },
          }));

        if (!result?.data.club) {
          throw new Error('No club found');
        }
        return result.data.club;
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  club = computed(() => this.clubResource.value());
  error = computed(() => this.clubResource.error()?.message || null);
  loading = computed(() => this.clubResource.isLoading());

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load club';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }
}
