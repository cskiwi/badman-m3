import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { RankingSystem } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export class HomeService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    rankingSystemId: new FormControl<string | null>(null),
  });

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private rankingSystemResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.rankingSystemId) {
        return null;
      }

      try {
        const result = await lastValueFrom(this.apollo
          .query<{ rankingSystem: RankingSystem }>({
            query: gql`
              query RankingSystem($rankingSystemId: ID) {
                rankingSystem(id: $rankingSystemId) {
                  id
                  name
                  amountOfLevels
                  pointsToGoUp
                  pointsToGoDown
                  pointsWhenWinningAgainst
                  calculationLastUpdate
                  primary
                }
              }
            `,
            variables: {
              id: params.rankingSystemId,
            },
            context: { signal: abortSignal },
          }));

        if (!result?.data.rankingSystem) {
          throw new Error('No rankingSystem found');
        }
        return result.data.rankingSystem;
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  rankingSystem = computed(() => this.rankingSystemResource.value());
  loading = computed(() => this.rankingSystemResource.isLoading());
  error = computed(() => this.rankingSystemResource.error()?.message || null);
  loadedAndError = computed(() => {
    return !this.loading() && this.error();
  });

  table = computed(() => {
    const rankingSystem = this.rankingSystem();
    if (!rankingSystem) return [];

    let level = rankingSystem.amountOfLevels ?? 0;
    return (
      rankingSystem.pointsWhenWinningAgainst?.map(
        (winning: number, index: number) => {
          return {
            level: level--,
            pointsToGoUp:
              level !== 0
                ? Math.round(rankingSystem.pointsToGoUp?.[index] ?? 0)
                : null,
            pointsToGoDown:
              index === 0
                ? null
                : Math.round(rankingSystem.pointsToGoDown?.[index - 1] ?? 0),
            pointsWhenWinningAgainst: Math.round(winning),
          };
        },
      ) ?? []
    );
  });

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load rankingSystem';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }
}
