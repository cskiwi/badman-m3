/**
 * Tournament Sync Worker Service
 * Standalone background service for syncing tournaments from Tournament Software API
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Set global prefix for API endpoints
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  
  // Enable graceful shutdown
  app.enableShutdownHooks();
  
  // Configure port
  const port = process.env.TOURNAMENT_SYNC_WORKER_PORT || 3001;
  
  await app.listen(port);
  
  Logger.log(`🚀 Tournament Sync Worker is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log('📊 Available endpoints:');
  Logger.log(`   GET  http://localhost:${port}/${globalPrefix}/status - Service status`);
  Logger.log(`   GET  http://localhost:${port}/${globalPrefix}/health - Health check`);
  Logger.log(`   GET  http://localhost:${port}/${globalPrefix}/jobs - Get recent jobs`);
  Logger.log(`   POST http://localhost:${port}/${globalPrefix}/sync/discovery - Trigger discovery sync`);
  Logger.log(`   POST http://localhost:${port}/${globalPrefix}/sync/competitions - Trigger competition sync`);
  Logger.log(`   POST http://localhost:${port}/${globalPrefix}/sync/tournaments - Trigger tournament sync`);
}

bootstrap().catch(err => {
  Logger.error('Failed to start Tournament Sync Worker', err);
  process.exit(1);
});
