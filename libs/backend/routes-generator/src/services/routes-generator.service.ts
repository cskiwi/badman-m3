import { Injectable } from '@nestjs/common';

@Injectable()
export class RoutesGeneratorService {
  generateRoutesTxt() {
    const routes: string[] = ['/', '/player'];
    const topPlayers = this.getTopPlayers();
    const mostSearchedPlayers = this.getMostSearchedPlayers();

    topPlayers.forEach((player) => {
      routes.push(`/player/${player}`);
    });

    mostSearchedPlayers.forEach((player) => {
      routes.push(`/player/${player}`);
    });

    return routes.join('\n');
  }

  // get top players
  private getTopPlayers() {
    return [];
  }

  // get most searched players
  private getMostSearchedPlayers() {
    return ['glenn-latomme'];
  }
}
