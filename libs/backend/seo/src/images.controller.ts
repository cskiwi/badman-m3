// import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
// import { Response } from 'express';
// import { PlayerImageGenerator } from './images/player';
// import { ClubImageGenerator } from './images/club';

// @Controller({ path: 'images' })
// export class ImagesController {
//   private readonly _logger = new Logger(ImagesController.name);

//   @Get()
//   async generateImage(
//     @Res() res: Response,
//     @Query('id') id: string,
//     @Query('type') type: 'player' | 'club',
//   ) {
//     let result;
//     let imageBuffer: Buffer | undefined;

//     switch (type) {
//       case 'player':
//         result = await new PlayerImageGenerator().generateImage(id);
//         if ('status' in result) {
//           res.status(result.status).send(result.message);
//           return;
//         }
//         imageBuffer = result;
//         break;
//       case 'club':
//         result = await new ClubImageGenerator().generateImage(id);
//         if ('status' in result) {
//           res.status(result.status).send(result.message);
//           return;
//         }

//         imageBuffer = result;
//         break;
//       default:
//         break;
//     }

//     res.set('Content-Type', 'image/png');
//     res.send(imageBuffer);
//   }
// }
