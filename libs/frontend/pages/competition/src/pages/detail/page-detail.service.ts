import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { CompetitionEvent } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Subject, merge } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  switchMap,
} from 'rxjs/operators';

interface DetailState {
  competition: CompetitionEvent | null;
  loading: boolean;
  error: string | null;
}

export class DetailService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    competitionId: new FormControl<string | null>(null),
  });

  // state
  private initialState: DetailState = {
    competition: null,
    error: null,
    loading: true,
  };

  // selectors
  competition = computed(() => this.state().competition);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);

  //sources
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(
    distinctUntilChanged((a, b) => a.competitionId === b.competitionId),
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
      map((competition) => ({
        competition,
        loading: false,
      })),
    ),
    this.error$.pipe(map((error) => ({ error }))),
    this.filterChanged$.pipe(map(() => ({ loading: true }))),
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
  });

  private _loadData(
    filter: Partial<{
      competitionId: string | null;
    }>,
  ) {
    return this.apollo
      .query<{ competition: CompetitionEvent }>({
        query: gql`
          query Competition($id: ID!) {
            competitionEvent(id: $id) {
              id
              name
              slug
            }
          }
        `,
        variables: {
          id: filter?.competitionId,
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((result) => {
          if (!result?.data.competition) {
            throw new Error('No competition found');
          }
          return result.data.competition;
        }),
      );
  }

  private handleError(err: HttpErrorResponse) {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      this.error$.next(`Failed to load competition`);
      return;
    }

    // Generic error if no cases match
    this.error$.next(err.statusText);
  }
}
