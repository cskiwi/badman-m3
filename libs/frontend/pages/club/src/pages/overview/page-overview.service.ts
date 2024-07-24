import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Club } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Subject, merge } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';

interface OverviewState {
  clubs: Club[];
  loading: boolean;
  error: string | null;
}

export class OverviewService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    query: new FormControl(undefined),
  });

  // state
  private initialState: OverviewState = {
    clubs: [],
    error: null,
    loading: true,
  };

  // selectors
  clubs = computed(() => this.state().clubs);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);

  //sources
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(
    startWith(this.filter.value),
    distinctUntilChanged(),
  );

  private clubsLoaded$ = this.filterChanged$.pipe(
    debounceTime(300), // Queries are better when debounced
    switchMap((filter) => this._loadClubsApollo(filter)),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.clubsLoaded$.pipe(
      map((clubs) => ({
        clubs,
        loading: false,
      })),
    ),
    this.error$.pipe(map((error) => ({ error }))),
    // this.filterChanged$.pipe(map(() => ({ loading: true }))),
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
  });

  private _loadClubsApollo(
    filter: Partial<{
      query: string | null;
      where: { [key: string]: unknown } | null;
      emtpyWhere: { [key: string]: unknown };
    }>,
  ) {
    return this.apollo
      .query<{ clubs: Club[] }>({
        query: gql`
          query Clubs($where: [JSONObject!]) {
            clubs(where: $where) {
              id
              clubId
              fullName
              slug
            }
          }
        `,
        variables: {
          where: this._clubSearchWhere(filter.query),
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((result) => {
          if (!result?.data.clubs) {
            throw new Error('No clubs found');
          }
          return result.data.clubs.map((row) => row as Club);
        }),
      );
  }

  private handleError(err: HttpErrorResponse) {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      this.error$.next(`Failed to load clubs`);
      return;
    }

    // Generic error if no cases match
    this.error$.next(err.statusText);
  }

  private _clubSearchWhere(query: string | null | undefined) {
    const parts = query
      ?.toLowerCase()
      .replace(/[;\\\\/:*?"<>|&',]/, ' ')
      .split(' ')
      .map((part) => part.trim());
    const queries: unknown[] = [];
    if (!parts) {
      return;
    }

    for (const part of parts) {
      if (part.length < 1) continue;

      const possibleClubId = parseInt(part);

      if (!isNaN(possibleClubId)) {
        queries.push({ clubId: possibleClubId });
      }
      queries.push({ fullName: { $iLike: `%${part}%` } });
    }

    return queries;
  }
}
