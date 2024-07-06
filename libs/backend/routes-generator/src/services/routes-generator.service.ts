import { Player, RankingLastPlace } from '@app/models';
import { Injectable } from '@nestjs/common';
import { In, MoreThanOrEqual } from 'typeorm';

@Injectable()
export class RoutesGeneratorService {
  async generateRoutesTxt() {
    const routes: string[] = ['/', '/player'];

    (await this.getTopPlayers()).forEach((player) => {
      routes.push(`/player/${player}`);
    });

    (await this.getMostSearchedPlayers()).forEach((player) => {
      routes.push(`/player/${player}`);
    });

    // (await this.getActivePlayers()).forEach((player) => {
    //   routes.push(`/player/${player}`);
    // });

    return routes.join('\n');
  }

  // get top players
  private async getTopPlayers() {
    return [];
  }

  // get most searched players
  private async getMostSearchedPlayers() {
    return [];
  }

  private async getActivePlayers() {
    const CHUNK_SIZE = 1000;
    let offset = 0;
    let hasMore = true;
    let playerIdsAndSlugs: string[] = [];

    while (hasMore) {
      const places = await RankingLastPlace.find({
        select: ['playerId'],
        where: {
          rankingDate: MoreThanOrEqual(
            new Date(new Date().setMonth(new Date().getMonth() - 1)),
          ),
        },
        skip: offset,
        take: CHUNK_SIZE,
      });

      const playerIds = places.map((place) => place.playerId);

      const players = await Player.find({
        select: ['id', 'slug'],
        where: {
          id: In(playerIds),
        },
      });

      if (places.length < CHUNK_SIZE) {
        hasMore = false;
      } else {
        offset += CHUNK_SIZE;
      }

      const playerData = players.map((place) => [place.slug]);

      playerIdsAndSlugs = playerIdsAndSlugs.concat(...playerData);
    }

    return playerIdsAndSlugs;
  }
}
