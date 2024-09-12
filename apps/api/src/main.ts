import { Logger } from '@nestjs/common';

import { getServer } from '@app/backend-shared';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await getServer();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 5000);

  await app.listen(port);
  Logger.log(`🚀 Application is running on: ${await app.getUrl()}`);
}
bootstrap();
