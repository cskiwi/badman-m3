import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
// import { RankingSystem } from '@app/models';
import { isPlatformBrowser } from '@angular/common';

type RankingSystem = any;

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

  // Signals for state management
  private rankingSystemSignal = signal<RankingSystem | null>(null);
  private loadedSignal = signal<boolean>(false);

  constructor(){
    // Load initial system from sessionStorage
    this.loadInitialSystem();

    effect(() => {
      if (this.watchId()) {
        this.watchSystem(this.watchId() as string);

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

  // Public selectors
  system = computed(() => this.rankingSystemSignal());
  systemId = computed(() => this.rankingSystemSignal()?.id);
  primary = computed(() => this.rankingSystemSignal()?.primary);
  loaded = computed(() => this.loadedSignal());

  private async loadInitialSystem() {
    const savedId = this.isBrowser
      ? sessionStorage?.getItem(WATCH_SYSTEM_ID_KEY) ?? null
      : null;
    
    try {
      const system = await this._loadSystem(savedId);
      this.rankingSystemSignal.set(system);
      this.loadedSignal.set(true);
    } catch (error) {
      this.loadedSignal.set(true);
    }
  }

  async watchSystem(id: string) {
    if (!this.isBrowser) return;
    
    sessionStorage.setItem(WATCH_SYSTEM_ID_KEY, id);
    
    try {
      const system = await this._loadSystem(id);
      this.rankingSystemSignal.set(system);
      this.loadedSignal.set(true);
    } catch (error) {
      this.loadedSignal.set(true);
    }
  }

  async clearWatchSystem() {
    if (!this.isBrowser) return;
    
    sessionStorage.removeItem(WATCH_SYSTEM_ID_KEY);
    
    try {
      const system = await this._loadSystem(null);
      this.rankingSystemSignal.set(system);
      this.loadedSignal.set(true);
    } catch (error) {
      this.loadedSignal.set(true);
    }
  }

  async deleteSystem(id: string) {
    try {
      await this._deleteSystem(id);
      const system = await this._loadSystem(null);
      this.rankingSystemSignal.set(system);
      this.loadedSignal.set(true);
    } catch (error) {
      this.loadedSignal.set(true);
    }
  }

  private async _loadSystem(id?: string | null): Promise<RankingSystem | null> {
    try {
      const result = await this.apollo
        .query<{
          rankingSystem: RankingSystem;
        }>({
          query: SYSTEM_QUERY,
          variables: {
            id: id ?? null,
          },
        })
        .toPromise();
      
      return result?.data?.rankingSystem || null;
    } catch (error) {
      return null;
    }
  }

  private async _deleteSystem(id?: string | null) {
    return this.apollo.mutate({
      mutation: gql`
        mutation RemoveRankingSystem($id: ID!) {
          removeRankingSystem(id: $id)
        }
      `,
      variables: {
        id: id,
      },
    }).toPromise();
  }
}
