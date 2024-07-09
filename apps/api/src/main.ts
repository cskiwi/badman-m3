import { Logger } from '@nestjs/common';

import { getServer } from '@app/backend-root';

async function bootstrap() {
  const app = await getServer();
  const port = process.env.PORT || 5000;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: ${await app.getUrl()}`);
}
bootstrap();
