import { GamePlayerMembership, Player } from '@app/models';
import { GameType } from '@app/model/enums';
import sharp from 'sharp';

export class PlayerImageGenerator {
  private readonly backgroundColor = '#ffffff';
  private readonly textColor = '#24292e';
  private readonly subTextColor = '#586069';

  private readonly width = 1200;
  private readonly height = 630;

  private readonly amountGames = 25;

  async generateImage(id: string) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const playerQry = Player.createQueryBuilder('player')
      .select([
        'player.id',
        'player.slug',
        'player.memberId',
        'player.firstName',
        'player.lastName',
      ])
      .leftJoinAndSelect('player.rankingLastPlaces', 'rankingLastPlaces')
      .leftJoinAndSelect(
        'player.clubPlayerMemberships',
        'clubPlayerMemberships',
      )
      .leftJoinAndSelect('clubPlayerMemberships.club', 'club')
      .leftJoinAndSelect(
        'player.gamePlayerMemberships',
        'gamePlayerMemberships',
      )
      .leftJoinAndSelect(
        'gamePlayerMemberships.game',
        'game',
        'game.playedAt >= :oneYearAgo',
      )
      .where('player.slug = :id and "game"."id" is not null', { id })
      .setParameter('oneYearAgo', oneYearAgo)
      .orderBy('game.playedAt', 'DESC');

    const player = await playerQry.getOne();
    const games = player?.gamePlayerMemberships || [];

    // fake get games results last year for player
    const wins =
      games.map((membership) => {
        return membership?.game?.winner == membership?.team ? 1 : 0;
      }) || [];

    if (!player) {
      return {
        status: 404,
        message: 'Player not found',
      };
    }

    const svgImage = `
      <svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${this.width}" height="${this.height}" fill="${this.backgroundColor}" />
      
        ${this.getGeneralInfo(player)}
        ${this.getRanking(player)}
        ${this.getStats(games)}
        ${this.getGameRect(wins)}

      </svg>
    `;

    const imageBuffer = await sharp(Buffer.from(svgImage)).png().toBuffer();

    return imageBuffer;
  }

  getGeneralInfo(player: Player) {
    const clubs = player?.clubPlayerMemberships || [];
    const club = clubs?.find((membership) => membership.active)?.club;

    return `
        <text x="75" y="150" font-family="Arial" font-size="100" fill="${this.textColor}">
            <tspan font-weight="bold">${player.fullName}</tspan>
        </text>

        <text x="75" y="210" font-family="Arial" font-size="30" fill="${this.subTextColor}">
            ${player.memberId} ${club ? '- ' + club?.name : ''}
        </text>`;
  }

  getRanking(player: Player) {
    const rankingPlace = player?.rankingLastPlaces?.[0];
    return `
        <text x="75" y="350" font-family="Arial" font-size="75" fill="${this.textColor}">
            <tspan font-weight="bold">${rankingPlace?.single} - ${rankingPlace?.double} - ${rankingPlace?.mix}</tspan>
        </text>`;
  }

  getStats(games: GamePlayerMembership[]) {
    const results =
      games.map((membership) => {
        return membership?.game?.winner == membership?.team ? 1 : 0;
      }) || [];

    const wins = results.filter((t) => t === 1).length;
    const losses = results.filter((t) => t === 0).length;

    const tournaments = games.filter(
      (t) => t.game.linkType === 'tournament',
    ).length;
    const competitions = games.filter(
      (t) => t.game.linkType === 'competition',
    ).length;

    const singles = games.filter((t) => t.game.gameType === GameType.S);
    const doubles = games.filter((t) => t.game.gameType === GameType.D);
    const mix = games.filter((t) => t.game.gameType === GameType.MX);

    const singleWins = singles.filter((membership) => {
      return membership?.game?.winner == membership?.team;
    });

    const doubleWins = doubles.filter((membership) => {
      return membership?.game?.winner == membership?.team;
    });

    const mixWins = mix.filter((membership) => {
      return membership?.game?.winner == membership?.team;
    });

    return `
        <g font-family="Arial" font-size="20" fill="black">
            <g transform="translate(50, 500)">
                <text x="20" y="0" fill="${this.textColor}">${competitions}</text>
                <text x="20" y="30" fill="${this.subTextColor}">Competition</text>
            </g>
            <g transform="translate(200, 500)">
                <text x="20" y="0" fill="${this.textColor}">${tournaments}</text>
                <text x="20" y="30" fill="${this.subTextColor}">Tournament</text>
            </g>
            

            <g transform="translate(350, 500)">
            <text x="20" y="0" fill="${this.textColor}">
                <tspan>${singleWins.length} / </tspan>
                <tspan style="font-size: 14px">${singles.length}</tspan>
            </text>
            <text x="20" y="30" fill="${this.subTextColor}">Singles</text>
            </g>

            <g transform="translate(500, 500)">
                <text x="20" y="0" fill="${this.textColor}">
                  <tspan>${doubleWins.length} / </tspan>
                  <tspan style="font-size: 14px">${doubles.length}</tspan>
                </text>
                <text x="20" y="30" fill="${this.subTextColor}">Doubles</text>
            </g>

            <g transform="translate(650, 500)">
                <text x="20" y="0" fill="${this.textColor}">
                  <tspan>${mixWins.length} / </tspan>
                  <tspan style="font-size: 14px">${mix.length}</tspan>
                </text>
                <text x="20" y="30" fill="${this.subTextColor}">Mix</text>
            </g>

            <g transform="translate(800, 500)">
                <text x="20" y="0" fill="${this.textColor}">${wins}</text>
                <text x="20" y="30" fill="${this.subTextColor}">Wins</text>
            </g>

            
            <g transform="translate(950, 500)">
                <text x="20" y="0" fill="${this.textColor}">${losses}</text>
                <text x="20" y="30" fill="${this.subTextColor}">Losses</text>
            </g>
        </g>`;
  }

  getGameRect(games: number[]) {
    const amountGames = Math.min(this.amountGames, games.length);
    const heightGames = 20;
    const widthGames = this.width / amountGames;

    return `
        <g transform="translate(0, ${this.height - heightGames})">
            ${games
              .slice(0, amountGames)
              .reverse()
              .map(
                (game, index) => `
                <rect x="${index * widthGames}" y="0" width="${widthGames}" height="${heightGames}" fill="${
                  game === 1 ? '#28a745' : '#cb2431'
                }" />
              `,
              )
              .join('')} 
        </g>`;
  }
}
