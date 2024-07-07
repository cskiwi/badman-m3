import { Injectable } from '@nestjs/common';

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

    return routes.join('\n');
  }

  // get top players
  private async getTopPlayers() {
    return ['glenn-latomme'];
  }

  // get most searched players
  private async getMostSearchedPlayers() {
    return [];
  }
}
