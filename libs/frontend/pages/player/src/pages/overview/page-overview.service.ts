import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Player } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { debounceTime } from 'rxjs/operators';

export class OverviewService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    query: new FormControl(undefined),
  });

  // Convert form to signal for resource with debounce
  private filterSignal = toSignal(this.filter.valueChanges.pipe(debounceTime(300)));

  private playersResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params) {
        return [];
      }

      try {
        const result = await this.apollo
          .query<{ players: Player[] }>({
            query: gql`
              query Players($args: PlayerArgs) {
                players(args: $args) {
                  id
                  memberId
                  fullName
                  slug
                }
              }
            `,
            variables: {
              args: {
                where: this._playerSearchWhere(params.query),
              },
            },
            context: { signal: abortSignal },
          })
          .toPromise();

        if (!result?.data.players) {
          throw new Error('No players found');
        }
        return result.data.players;
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  players = computed(() => this.playersResource.value() ?? []);
  error = computed(() => this.playersResource.error()?.message || null);
  loading = computed(() => this.playersResource.isLoading());

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load players';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }

  private _playerSearchWhere(query: string | null | undefined) {
    const parts = query
      ?.toLowerCase()
      .replace(/[;\\\\/:*?"<>|&',]/, ' ')
      .split(' ');

    if (!parts) {
      return [{ memberId: '$nNull' }];
    }

    const queries: unknown[] = [];
    for (const part of parts ?? []) {
      queries.push(
        { firstName: { $iLike: `%${part}%` } },
        { lastName: { $iLike: `%${part}%` } },
        { memberId: { $iLike: `%${part}%` } },
      );
    }

    if (queries.length === 0) {
      return;
    }

    return queries;
  }
}
