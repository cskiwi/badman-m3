import { Injectable, computed, inject, resource, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { SsrCookieService } from 'ngx-cookie-service-ssr';
import { lastValueFrom } from 'rxjs';
import { RankingSystem } from '@app/models';

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
      startDate
      endDate
    }
  }
`;

const WATCH_SYSTEM_ID_KEY = 'watch.system.id';
@Injectable({
  providedIn: 'root',
})
export class RankingSystemService {
  private readonly apollo = inject(Apollo);
  private readonly cookieService = inject(SsrCookieService);

  // Signal to drive the resource
  private systemIdSignal = signal<string | null>(this.cookieService.get(WATCH_SYSTEM_ID_KEY) || null);

  private systemResource = resource({
    params: () => ({ id: this.systemIdSignal() }),
    loader: async ({ params, abortSignal }) => {
      const result = await lastValueFrom(
        this.apollo.query<{ rankingSystem: RankingSystem }>({
          query: SYSTEM_QUERY,
          variables: { id: params.id ?? null },
          context: { signal: abortSignal },
        }),
      );

      return result?.data?.rankingSystem || null;
    },
  });

  // Public selectors
  system = computed(() => this.systemResource.value());
  systemId = computed(() => this.system()?.id);
  startDate = computed(() => this.system()?.startDate);
  endDate = computed(() => this.system()?.endDate);
  isActive = computed(() => !this.system()?.endDate);
  loaded = computed(() => !this.systemResource.isLoading());
  error = computed(() => this.systemResource.error()?.message || null);

  watchSystem(id: string) {
    this.cookieService.set(WATCH_SYSTEM_ID_KEY, id);
    this.systemIdSignal.set(id);
  }

  clearWatchSystem() {
    this.cookieService.delete(WATCH_SYSTEM_ID_KEY);
    this.systemIdSignal.set(null);
  }

  // async deleteSystem(id: string) {
  //   await lastValueFrom(
  //     this.apollo.mutate({
  //       mutation: gql`
  //         mutation RemoveRankingSystem($id: ID!) {
  //           removeRankingSystem(id: $id)
  //         }
  //       `,
  //       variables: { id },
  //     }),
  //   );

  //   this.cookieService.delete(WATCH_SYSTEM_ID_KEY);
  //   this.systemIdSignal.set(null);
  // }
}
