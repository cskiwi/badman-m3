import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { GamePlayerMembership, Player } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Subject, merge } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap, filter, tap } from 'rxjs/operators';

interface DetailState {
  games: GamePlayerMembership[] | null;
  loading: boolean;
  error: string | null;
}

export class DetailService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    playerId: new FormControl<string | null>(null),
    date: new FormControl<Date | null>(moment().subtract(1, 'year').toDate()),
    minGames: new FormControl<number>(0),
    linkType: new FormControl<'tournament' | 'competition' | null>(null),
    gameType: new FormControl<'D' | 'X' | null>(null),
  });

  // state
  private readonly initialState: DetailState = {
    games: null,
    error: null,
    loading: true,
  };

  // selectors
  memberships = computed(() => this.state().games);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);

  //sources
  private readonly error$ = new Subject<string | null>();
  private readonly filterChanged$ = this.filter.valueChanges.pipe(
    distinctUntilChanged((a, b) => a.playerId === b.playerId && a.date === b.date && a.linkType === b.linkType && a.gameType === b.gameType),
    filter((filter) => {
      // Only allow null or valid dates (using moment)
      const d = filter?.date;
      return moment(d).isValid();
    }),
  );

  private readonly data$ = this.filterChanged$.pipe(
    switchMap((filter) => this._loadData(filter)),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.data$.pipe(
      map((gamePlayerMemberships) => ({
        games: gamePlayerMemberships,
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
      playerId: string | null;
      date: Date | null;
      linkType: 'tournament' | 'competition' | null;
      gameType: 'D' | 'X' | null;
    }>,
  ) {
    return this.apollo
      .query<{ player: Player }>({
        query: gql`
          query Player($id: ID!, $args: GamePlayerMembershipArgs) {
            player(id: $id) {
              id
              fullName
              memberId
              slug
              gamePlayerMemberships(args: $args) {
                id
                team
                player
                game {
                  id
                  gameType
                  playedAt
                  winner
                  gamePlayerMemberships {
                    id
                    team
                    player
                    gamePlayer {
                      id
                      fullName
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          id: filter?.playerId,
          args: {
            // take everything
            take: null,
            where: {
              game: {
                linkType: filter?.linkType,
                gameType:
                  filter?.gameType == null
                    ? {
                        $ne: 'S',
                      }
                    : filter?.gameType,
                playedAt: {
                  $gte: filter?.date,
                },
              },
            },
          },
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
          return result.data.player.gamePlayerMemberships;
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
