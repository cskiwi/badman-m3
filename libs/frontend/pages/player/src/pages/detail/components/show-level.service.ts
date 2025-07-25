import { Injectable, computed, inject, signal } from '@angular/core';
import { Player, RankingPlace } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ShowLevelService {
  apollo = inject(Apollo);

  private rankingPlaceSignal = signal<RankingPlace | null>(null);
  private loadedSignal = signal<boolean>(false);

  rankingPlace = computed(() => this.rankingPlaceSignal());
  loaded = computed(() => this.loadedSignal());

  async getRanking(id: string, systemId: string) {
    try {
      const result = await lastValueFrom(this.apollo.query<{ player: Player }>({
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
              systemId: {
                eq: systemId || null,
              }
            },
          },
        },
      }));

      const player = result?.data?.player;
      const rankingPlace = player?.rankingLastPlaces?.[0] || null;
      
      this.rankingPlaceSignal.set(rankingPlace);
      this.loadedSignal.set(true);
    } catch (error) {
      this.rankingPlaceSignal.set(null);
      this.loadedSignal.set(true);
    }
  }
}
