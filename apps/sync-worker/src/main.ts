/**
 * Tournament Sync Worker Service
 * Standalone background service for syncing tournaments from Tournament Software API
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown
  app.enableShutdownHooks();
  
  // Start the application - this is crucial for processors to start listening
  await app.init();
  
  Logger.log('Tournament Sync Worker is running and listening for jobs...');
}

bootstrap().catch(err => {
  Logger.error('Failed to start Tournament Sync Worker', err);
  process.exit(1);
});
