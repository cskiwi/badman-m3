import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { BASE_URL } from '@app/frontend-utils';
import { Player } from '@app/models';
import { Apollo, TypedDocumentNode, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Subject, merge } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';

const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
  }),
};

interface OverviewState {
  players: Player[];
  loading: boolean;
  error: string | null;
}

export class OverviewService {
  // private readonly apollo = inject(Apollo);
  private readonly http = inject(HttpClient);
  private readonly base = inject(BASE_URL);

  filter = new FormGroup({
    where: new FormControl<{
      [key: string]: unknown;
    }>({}),
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
    // filter((filter) => Object.keys(filter.where ?? {}).length > 0),
    distinctUntilChanged(),
  );

  private playersLoaded$ = this.filterChanged$.pipe(
    // debounceTime(300), // Queries are better when debounced
    switchMap((filter) => this._loadPlayers(filter)),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.playersLoaded$.pipe(
      map((players) => ({
        players,
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

  private _loadPlayers(
    filter: Partial<{
      query: string | null;
      where: { [key: string]: unknown } | null;
      emtpyWhere: { [key: string]: unknown };
    }>,
  ) {
    return this.http
      .post<{
        data: { players: Player[] };
      }>(
        `${this.base}/graphql`,
        JSON.stringify({
          query: `
            query Players {
              players {
                id
                memberId
                fullName
              }
            }
          `,
        }),
        httpOptions,
      )
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((result) => {
          if (!result?.data.players) {
            throw new Error('No players found');
          }
          return result.data.players.map((row) => row as Player);
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

  private _playerSearchWhere(
    args: Partial<{
      query: string | null;
      where: { [key: string]: unknown } | null;
      emptyWhere: { [key: string]: unknown };
    }>,
  ) {
    if (!args?.query) {
      return args?.emptyWhere ?? {};
    }

    const parts = args?.query
      ?.toLowerCase()
      .replace(/[;\\\\/:*?"<>|&',]/, ' ')
      .split(' ');
    const queries: unknown[] = [];
    if (!parts) {
      return;
    }
    for (const part of parts) {
      queries.push({
        $or: [
          { firstName: { $iLike: `%${part}%` } },
          { lastName: { $iLike: `%${part}%` } },
          { memberId: { $iLike: `%${part}%` } },
        ],
      });
    }

    return {
      $and: queries,
      ...args?.where,
    };
  }
}
