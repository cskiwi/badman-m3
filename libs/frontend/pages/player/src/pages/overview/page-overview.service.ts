import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Player } from '@app/models';
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
  players: Player[];
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
    players: [],
    error: null,
    loading: true,
  };

  // selectors
  players = computed(() => this.state().players);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);

  //sources
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(
    startWith(this.filter.value),
    distinctUntilChanged(),
  );

  private data$ = this.filterChanged$.pipe(
    debounceTime(300), // Queries are better when debounced
    switchMap((filter) => this._loadData(filter)),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.data$.pipe(
      map((players) => ({
        players,
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

  private _loadData(
    filter: Partial<{
      query: string | null;
    }>,
  ) {
    if (!filter) {
      return EMPTY;
    }

    return this.apollo
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
            where: this._playerSearchWhere(filter.query),
          },
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((result) => {
          if (!result?.data.players) {
            throw new Error('No players found');
          }
          return result.data.players.map((row) => row);
        }),
      );
  }

  private handleError(err: HttpErrorResponse) {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      this.error$.next(`Failed to load players`);
      return;
    }

    // Generic error if no cases match
    this.error$.next(err.statusText);
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
