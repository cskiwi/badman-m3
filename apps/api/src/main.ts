import { Logger } from '@nestjs/common';

import { getServer, createWinstonLogger } from '@apps/shared';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await getServer();
  
  // Configure Winston logger
  const logger = createWinstonLogger({ name: 'api', logDir: 'logs' });
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 5000);

  await app.listen(port);
  logger.log(`🚀 API server is running on: ${await app.getUrl()}`);
}
bootstrap();
