import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PlayerImageGenerator } from './images/player';
import { ClubImageGenerator } from './images/club';

@Controller({ path: 'images' })
export class ImagesController {
  private readonly _logger = new Logger(ImagesController.name);

  @Get()
  async generateImage(
    @Res() res: Response,
    @Query('id') id: string,
    @Query('type') type: 'player' | 'club',
  ) {
    let imageBuffer: Buffer | undefined;

    switch (type) {
      case 'player':
        imageBuffer = await new PlayerImageGenerator().generateImage(id);
        break;
      case 'club':
        imageBuffer = await new ClubImageGenerator().generateImage(id);
        break;
      default:
        break;
    }

    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);
  }
}
