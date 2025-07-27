import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { isPlatformBrowser } from '@angular/common';
import { lastValueFrom } from 'rxjs';

// TODO: Replace 'any' with the actual RankingSystem type if available
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
  // NOTE: This service is now fully decoupled from routing context.
  // If you need to use route/query params, inject ActivatedRoute in your component and pass the required data to the service methods as arguments.

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Signals for state management
  private rankingSystemSignal = signal<RankingSystem | null>(null);
  private loadedSignal = signal<boolean>(false);

  constructor(){
    // Load initial system from sessionStorage
    this.loadInitialSystem();
    // NOTE: Any effects or navigation logic should be handled in the component, not here.
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
      const result = await lastValueFrom(this.apollo
        .query<{
          rankingSystem: RankingSystem;
        }>({
          query: SYSTEM_QUERY,
          variables: {
            id: id ?? null,
          },
        }));
      
      return result?.data?.rankingSystem || null;
    } catch (error) {
      return null;
    }
  }

  private async _deleteSystem(id?: string | null) {
    return lastValueFrom(this.apollo.mutate({
      mutation: gql`
        mutation RemoveRankingSystem($id: ID!) {
          removeRankingSystem(id: $id)
        }
      `,
      variables: {
        id: id,
      },
    }));
  }
}
