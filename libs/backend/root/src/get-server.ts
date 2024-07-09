import { VersioningType } from '@nestjs/common';
import { AbstractHttpAdapter, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export const getServer = async (adapter?: AbstractHttpAdapter) => {
  const app = adapter
    ? await NestFactory.create(AppModule, adapter)
    : await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.enableShutdownHooks();
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  return app;
};
