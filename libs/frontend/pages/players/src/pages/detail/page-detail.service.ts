import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Player } from '@app/models';
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
  player: Player | null;
  loading: boolean;
  error: string | null;
}

export class DetailService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    playerId: new FormControl<string | null>(null),
  });

  // state
  private initialState: DetailState = {
    player: null,
    error: null,
    loading: true,
  };

  // selectors
  player = computed(() => this.state().player);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);

  //sources
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(
    distinctUntilChanged((a, b) => a.playerId === b.playerId),
  );

  private playerLoaded$ = this.filterChanged$.pipe(
    switchMap((filter) => this._loadPlayerApollo(filter)),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.playerLoaded$.pipe(
      map((player) => ({
        player,
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

  private _loadPlayerApollo(
    filter: Partial<{
      playerId: string | null;
    }>,
  ) {
    return this.apollo
      .query<{ player: Player }>({
        query: gql`
          query Player($id: ID!) {
            player(id: $id) {
              id
              fullName
              memberId
              slug
            }
          }
        `,
        variables: {
          id: filter?.playerId,
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((result) => {
          if (!result?.data.player) {
            throw new Error('No player found');
          }
          return result.data.player;
        }),
      );
  }

  private handleError(err: HttpErrorResponse) {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      this.error$.next(`Failed to load player`);
      return;
    }

    // Generic error if no cases match
    this.error$.next(err.statusText);
  }
}
