import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Game, GamePlayerMembership, Player } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, merge, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap } from 'rxjs/operators';

const PLAYER_RECENT_GAMES_QUERY = gql`
  query PlayerRecentGames($playerId: ID!, $args: GamePlayerMembershipArgs) {
    player(id: $playerId) {
      id
      gamePlayerMemberships(args: $args) {
        id
        game {
          id
          playedAt
          gameType
          set1Team1
          set1Team2
          set2Team1
          set2Team2
          set3Team1
          set3Team2
          gamePlayerMemberships {
            id
            player
            single
            team
            mix
            double
            gamePlayer {
              id
              fullName
            }
          }
        }
      }
    }
  }
`;

interface PlayerRecentGamesState {
  games: Game[];
  loading: boolean;
  error: string | null;
}

export class PlayerRecentGamesService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    playerId: new FormControl<string | null>(null),
    skip: new FormControl<number>(0),
    take: new FormControl<number>(10),
  });

  // state
  private initialState: PlayerRecentGamesState = {
    games: [],
    error: null,
    loading: true,
  };

  // selectors
  games = computed(() => this.state().games);

  loading = computed(() => this.state().loading);

  //sources
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(distinctUntilChanged((a, b) => a.playerId === b.playerId));

  private data$ = this.filterChanged$.pipe(
    switchMap((filter) => this._loadData(filter)),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.data$.pipe(
      map((games) => ({
        games,
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
    }),
  });

  private _loadData(
    filter: Partial<{
      playerId: string | null;
      skip: number | null;
      take: number | null;
    }>,
  ) {
    const variables = {
      playerId: filter?.playerId,
      args: {
        skip: filter?.skip,
        take: filter?.take,
        where: {
          game: {
            set1Team1: {
              $gt: 0,
            },
            set1Team2: {
              $gt: 0,
            },
            playedAt: {
              $lte: moment().format('YYYY-MM-DD'),
            },
          },
        },
        order: {
          game: {
            playedAt: 'DESC',
          },
        },
      },
    };

    return this.apollo
      .query<{ player: Player }>({
        query: PLAYER_RECENT_GAMES_QUERY,
        variables,
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((result) => {
          if (!result?.data.player?.gamePlayerMemberships) {
            throw new Error('No rankingSystem found');
          }
          return result.data.player.gamePlayerMemberships as GamePlayerMembership[];
        }),
        map((games) => games.map((game) => game.game).flat()),
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
