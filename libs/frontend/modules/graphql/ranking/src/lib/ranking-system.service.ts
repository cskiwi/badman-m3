import { Injectable, PLATFORM_ID, computed, effect, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, merge, of } from 'rxjs';
import { filter, map, switchMap, tap } from 'rxjs/operators';

import { signalSlice } from 'ngxtension/signal-slice';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
// import { RankingSystem } from '@app/models';
import { isPlatformBrowser } from '@angular/common';

type RankingSystem = any;

export interface RankingState {
  rankingSystem: RankingSystem | null;
  loaded: boolean;
}

const SYSTEM_QUERY = gql`
  query GetRankingSystem($id: ID) {
    rankingSystem(id: $id) {
      id
      name
      differenceForDowngradeSingle
      differenceForDowngradeDouble
      differenceForDowngradeMix
      differenceForUpgradeSingle
      differenceForUpgradeDouble
      differenceForUpgradeMix
      updateLastUpdate
      calculationLastUpdate
      calculationIntervalUnit
      calculationIntervalAmount
      calculationDayOfWeek
      minNumberOfGamesUsedForUpgrade
      minNumberOfGamesUsedForDowngrade
      updateIntervalAmount
      updateIntervalUnit
      updateDayOfWeek
      periodAmount
      periodUnit
      pointsToGoUp
      pointsWhenWinningAgainst
      pointsToGoDown
      amountOfLevels
      latestXGamesToUse
      primary
    }
  }
`;

const WATCH_SYSTEM_ID_KEY = 'watch.system.id';
@Injectable({
  providedIn: 'root',
})
export class RankingSystemService {
  private readonly apollo = inject(Apollo);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private queryParams = toSignal(this.route.queryParamMap);

  watchId = computed(() => this.queryParams()?.get('watch'));

  constructor(){
    effect(() => {
      if (this.watchId()) {
        this.state.watchSystem(this.watchId() as string);

        const queryParams: { [key: string]: string | undefined } = {
          ...this.route.snapshot.queryParams,
          watch: undefined,
        };

        this.router.navigate([], {
          relativeTo: this.route,
          queryParams,
          queryParamsHandling: 'merge',
        });
      }
    });
  }

  // state
  initialState: RankingState = {
    rankingSystem: null,
    loaded: false,
  };

  // selectors
  system = computed(() => this.state().rankingSystem);
  systemId = computed(() => this.state().rankingSystem?.id);
  primary = computed(() => this.state().rankingSystem?.primary);

  // sources
  private servicesLoaded$ = of(
    this.isBrowser
      ? sessionStorage?.getItem(WATCH_SYSTEM_ID_KEY) ?? null
      : null,
  ).pipe(switchMap((saved) => this._loadSystem(saved)));

  sources$ = merge(
    this.servicesLoaded$.pipe(
      map((rankingSystem) => ({
        rankingSystem,
        loaded: true,
      })),
    ),
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
    actionSources: {
      watchSystem: (_state, action$: Observable<string>) =>
        action$.pipe(
          filter(() => this.isBrowser),
          tap((id) => sessionStorage.setItem(WATCH_SYSTEM_ID_KEY, id)),
          switchMap((id) =>
            this._loadSystem(id).pipe(
              map((system) => ({ rankingSystem: system, loaded: true })),
            ),
          ),
        ),
      clearWatchSystem: (_state, action$: Observable<void>) =>
        action$.pipe(
          filter(() => this.isBrowser),
          tap(() => sessionStorage.removeItem(WATCH_SYSTEM_ID_KEY)),
          switchMap(() =>
            this._loadSystem(null).pipe(
              map((system) => ({ rankingSystem: system, loaded: true })),
            ),
          ),
        ),
      deleteSystem: (_state, action$: Observable<string>) =>
        action$.pipe(
          // delete system
          switchMap((id) => this._deleteSystem(id)),
          // load the default system
          switchMap(() =>
            this._loadSystem(null).pipe(
              map((system) => ({ rankingSystem: system, loaded: true })),
            ),
          ),
        ),
    },
  
  });

  private _loadSystem(id?: string | null) {
    return this.apollo
      .query<{
        rankingSystem: RankingSystem;
      }>({
        query: SYSTEM_QUERY,
        variables: {
          id: id ?? null,
        },
      })
      .pipe(map((res) => res.data?.rankingSystem));
  }

  private _deleteSystem(id?: string | null) {
    return this.apollo.mutate({
      mutation: gql`
        mutation RemoveRankingSystem($id: ID!) {
          removeRankingSystem(id: $id)
        }
      `,
      variables: {
        id: id,
      },
    });
  }
}
