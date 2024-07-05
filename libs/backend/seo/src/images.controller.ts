import { Player } from '@app/models';
import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller({ path: 'images' })
export class ImagesController {
  private readonly backgroundColor = '#ffffff';
  private readonly textColor = '#24292e';
  private readonly subTextColor = '#586069';

  private readonly width = 1200;
  private readonly height = 630;

  private readonly sharp = require('sharp');

  @Get()
  async generateImage(@Res() res: Response, @Query('id') id: string) {
    const player = await Player.findOne({
      where: {
        slug: id,
      },
    });

    // fake get games results last year for player
    const games = [1, 0, 1, 1, 1, 0, 1, 0, 1, 1];

    if (!player) {
      res.status(404).send('Player not found');
      return;
    }

    const svgImage = `
      <svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${this.width}" height="${this.height}" fill="${this.backgroundColor}" />
      
        ${this.getGeneralInfo(player)}
        ${this.getRankging(player)}
        ${this.getStats(games)}
        ${this.getGameRect(games)}

      </svg>
    `;

    // console.log(svgImage);

    const imageBuffer = await this.sharp(Buffer.from(svgImage))
      .png()
      .toBuffer();

    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);
  }

  getGeneralInfo(player: Player) {
    return `
        <text x="75" y="150" font-family="Arial" font-size="100" fill="${this.textColor}">
            <tspan font-weight="bold">${player.fullName}</tspan>
        </text>

        <text x="75" y="210" font-family="Arial" font-size="30" fill="${this.subTextColor}">
            ${player.memberId} - Smash For Fun
        </text>`;
  }

  getRankging(player: Player) {
    return `
        <text x="75" y="350" font-family="Arial" font-size="75" fill="${this.textColor}">
            <tspan font-weight="bold">5 - 5 - 5</tspan>
        </text>`;
  }

  getStats(games: any[]) {
    return `
        <g font-family="Arial" font-size="20" fill="black">
            <g transform="translate(50, 500)">
                <text x="20" y="0" fill="${this.textColor}">8</text>
                <text x="20" y="30" fill="${this.subTextColor}">Competitions</text>
            </g>
            <g transform="translate(350, 500)">
                <text x="20" y="0" fill="${this.textColor}">8</text>
                <text x="20" y="30" fill="${this.subTextColor}">Tournaments</text>
            </g>
            <g transform="translate(650, 500)">
                <text x="20" y="0" fill="${this.textColor}">8</text>
                <text x="20" y="30" fill="${this.subTextColor}">Wins</text>
            </g>
            <g transform="translate(950, 500)">
                <text x="20" y="0" fill="${this.textColor}">8</text>
                <text x="20" y="30" fill="${this.subTextColor}">Losses</text>
            </g>
        </g>`;
  }

  getGameRect(games: number[]) {
    const amountGames = 10;
    const heightGames = 20;
    const widthGames = this.width / amountGames;

    return `
        <g transform="translate(0, ${this.height - heightGames})">
            ${games
              .slice(0, amountGames)
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
