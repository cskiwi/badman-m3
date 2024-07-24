import { Club, Team } from '@app/models';
import { SubEventTypeEnum } from '@app/models/enums';
import { createCanvas } from 'canvas';
import sharp from 'sharp';

export class ClubImageGenerator {
  private readonly backgroundColor = '#ffffff';
  private readonly textColor = '#24292e';
  private readonly subTextColor = '#586069';

  private readonly width = 1200;
  private readonly height = 630;

  async generateImage(id: string) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const clubQry = Club.createQueryBuilder('club')
      .select(['club.id', 'club.clubId', 'club.name', 'teams.type'])
      .leftJoinAndSelect('club.teams', 'teams')
      .where('club.slug = :id ', { id });

    const club = await clubQry.getOne();

    if (!club) {
      return {
        status: 404,
        message: 'Club not found',
      };
    }

    const svgImage = `
      <svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${this.width}" height="${this.height}" fill="${this.backgroundColor}" />
      
        ${this.getGeneralInfo(club)}
        ${this.getStats(club.teams || [])}

      </svg>
    `;

    // console.log(svgImage);

    const imageBuffer = await sharp(Buffer.from(svgImage)).png().toBuffer();

    return imageBuffer;
  }

  getGeneralInfo(club: Club) {
    let fontSize = 100;
    const clubName = club.name;
    const clubNameWidth = this.getTextWidth(clubName, 'Arial', fontSize);

    if (clubNameWidth > this.width - 350) {
      const scaleFactor = (this.width - 350) / clubNameWidth;
      fontSize = Math.floor(fontSize * scaleFactor);
    }

    return `
      <text x="75" y="150" font-family="Arial" font-size="${fontSize}" fill="${this.textColor}">
        <tspan font-weight="bold">${club.fullName}</tspan>
      </text>

      <text x="75" y="210" font-family="Arial" font-size="30" fill="${this.subTextColor}">
        ${club.clubId}
      </text>`;
  }

  getStats(teams: Team[]) {
    const mix = teams?.filter((team) => team.type === SubEventTypeEnum.MX);
    const female = teams?.filter((team) => team.type === SubEventTypeEnum.F);
    const male = teams?.filter((team) => team.type === SubEventTypeEnum.M);
    const national = teams?.filter(
      (team) => team.type === SubEventTypeEnum.NATIONAL,
    );

    return `
        <g font-family="Arial" font-size="20" fill="black">
            <g transform="translate(50, 500)">
                <text x="20" y="0" fill="${this.textColor}">${mix.length}</text>
                <text x="20" y="30" fill="${this.subTextColor}">Mix</text>
            </g>
            <g transform="translate(200, 500)">
                <text x="20" y="0" fill="${this.textColor}">${female.length}</text>
                <text x="20" y="30" fill="${this.subTextColor}">Female</text>
            </g>
             <g transform="translate(350, 500)">
                <text x="20" y="0" fill="${this.textColor}">${male.length}</text>
                <text x="20" y="30" fill="${this.subTextColor}">Male</text>
            </g>
             <g transform="translate(500, 500)">
                <text x="20" y="0" fill="${this.textColor}">${national.length}</text>
                <text x="20" y="30" fill="${this.subTextColor}">National</text>
            </g>
        </g>`;
  }

  getTextWidth(text: string, fontFamily: string, fontSize: number) {
    const canvas = createCanvas(0, 0);
    const context = canvas.getContext('2d');

    if (!context) {
      return 0;
    }

    context.font = `${fontSize}px ${fontFamily}`;
    const metrics = context.measureText(text);
    return metrics.width;
  }
}
