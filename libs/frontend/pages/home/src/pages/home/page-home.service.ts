import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { RankingSystem } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Subject, merge } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  switchMap,
} from 'rxjs/operators';

interface HomeState {
  rankingSystem: RankingSystem | null;
  loading: boolean;
  error: string | null;
}

export class HomeService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    rankingSystemId: new FormControl<string | null>(null),
  });

  // state
  private initialState: HomeState = {
    rankingSystem: null,
    error: null,
    loading: true,
  };

  // selectors
  rankingSystem = computed(() => this.state().rankingSystem);

  loading = computed(() => this.state().loading);

  //sources
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(
    distinctUntilChanged((a, b) => a.rankingSystemId === b.rankingSystemId),
  );

  private data$ = this.filterChanged$.pipe(
    switchMap((filter) => this._loadData(filter)),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.data$.pipe(
      map((rankingSystem) => ({
        rankingSystem,
        loading: false,
      })),
    ),
    this.error$.pipe(map((error) => ({ error }))),
    this.filterChanged$.pipe(map(() => ({ loading: true }))),
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
    selectors: (state) => ({
      loadedAndError: () => {
        return !state().loading && state().error;
      },
      table: () => {
        let level = state().rankingSystem?.amountOfLevels ?? 0;
        return (
          state().rankingSystem?.pointsWhenWinningAgainst?.map(
            (winning: number, index: number) => {
              return {
                level: level--,
                pointsToGoUp:
                  level !== 0
                    ? Math.round(
                        state().rankingSystem?.pointsToGoUp?.[index] ?? 0,
                      )
                    : null,
                pointsToGoDown:
                  index === 0
                    ? null
                    : Math.round(
                        state().rankingSystem?.pointsToGoDown?.[index - 1] ?? 0,
                      ),
                pointsWhenWinningAgainst: Math.round(winning),
              };
            },
          ) ?? []
        );
      },
    }),
  });

  private _loadData(
    filter: Partial<{
      rankingSystemId: string | null;
    }>,
  ) {
    return this.apollo
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
          id: filter?.rankingSystemId,
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((result) => {
          if (!result?.data.rankingSystem) {
            throw new Error('No rankingSystem found');
          }
          return result.data.rankingSystem;
        }),
      );
  }

  private handleError(err: HttpErrorResponse) {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      this.error$.next(`Failed to load rankingSystem`);
      return;
    }

    // Generic error if no cases match
    this.error$.next(err.statusText);
  }
}
