import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Player } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export class DetailService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    playerId: new FormControl<string | null>(null),
  });

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private playerResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.playerId) {
        return null;
      }

      try {
        const result = await lastValueFrom(this.apollo
          .query<{ player: Player }>({
            query: gql`
              query PlayerDetail($id: ID!) {
                player(id: $id) {
                  id
                  fullName
                  memberId
                  slug
                  clubPlayerMemberships {
                    end
                    start
                    active
                    club {
                      id
                      name
                      slug
                    }
                  }
                }
              }
            `,
            variables: {
              id: params.playerId,
            },
            context: { signal: abortSignal },
          }));

        if (!result?.data.player) {
          throw new Error('No player found');
        }
        return result.data.player;
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  player = computed(() => this.playerResource.value());
  club = computed(
    () =>
      this.player()?.clubPlayerMemberships?.find((cpm) => cpm.active)
        ?.club,
  );
  error = computed(() => this.playerResource.error()?.message || null);
  loading = computed(() => this.playerResource.isLoading());

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load player';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }
}
