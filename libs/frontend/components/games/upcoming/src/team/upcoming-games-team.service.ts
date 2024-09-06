import { Injectable, inject } from '@angular/core';
import { Player } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

export interface UpcomingGameTeamState {
  encounters: unknown;
  loaded: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ShowLevelService {
  apollo = inject(Apollo);

  initialState: UpcomingGameTeamState = {
    encounters: null,
    loaded: false,
  };

  // sources
  state = signalSlice({
    initialState: this.initialState,
    actionSources: {
      getRanking: (
        _state,
        action$: Observable<{
          id: string;
          systemId: string;
        }>,
      ) =>
        action$.pipe(
          switchMap(({ id, systemId }) =>
            this.apollo.query<{
              player: Player;
            }>({
              query: gql`
                query GetPlayerLevel($id: ID!, $args: RankingLastPlaceArgs) {
                  player(id: $id) {
                    id
                    rankingLastPlaces(args: $args) {
                      id
                      single
                      singlePoints
                      singlePointsDowngrade
                      double
                      doublePoints
                      doublePointsDowngrade
                      mix
                      mixPoints
                      mixPointsDowngrade
                      systemId
                    }
                  }
                }
              `,
              variables: {
                id,
                args: {
                  where: {
                    systemId: systemId || null,
                  },
                },
              },
            }),
          ),
          map((res) => res.data?.player),
          map((player) => ({
            rankingPlace: player?.rankingLastPlaces?.[0],
            loaded: true,
          })),
        ),
    },
  });
}
