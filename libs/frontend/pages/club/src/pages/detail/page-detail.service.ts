import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Club } from '@app/models';
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
  club: Club | null;
  loading: boolean;
  error: string | null;
}

export class DetailService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    clubId: new FormControl<string | null>(null),
  });

  // state
  private initialState: DetailState = {
    club: null,
    error: null,
    loading: true,
  };

  // selectors
  club = computed(() => this.state().club);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);

  //sources
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(
    distinctUntilChanged((a, b) => a.clubId === b.clubId),
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
      map((club) => ({
        club,
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
      clubId: string | null;
    }>,
  ) {
    return this.apollo
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
          id: filter?.clubId,
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((result) => {
          if (!result?.data.club) {
            throw new Error('No club found');
          }
          return result.data.club;
        }),
      );
  }

  private handleError(err: HttpErrorResponse) {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      this.error$.next(`Failed to load club`);
      return;
    }

    // Generic error if no cases match
    this.error$.next(err.statusText);
  }
}
