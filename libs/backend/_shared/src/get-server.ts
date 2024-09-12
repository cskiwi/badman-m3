import { Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AbstractHttpAdapter, NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
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
  app.enableCors({
    origin: '*',
    methods: '*',
    allowedHeaders: '*',
  });
  const configService = app.get(ConfigService);

  const config = new DocumentBuilder()
    .setTitle('Badman')
    .setDescription('The Badman API description')
    .setVersion('1.0')
    .addOAuth2(
      {
        type: 'oauth2',
        flows: {
          implicit: {
            authorizationUrl: `https://${configService.get('AUTH0_ISSUER_URL')}/authorize?audience=${configService.get('AUTH0_AUDIENCE')}`,
            scopes: {
              openid: 'Open Id',
              profile: 'Profile',
              email: 'E-mail',
              offline_access: 'Offline Access',
            },
          },
        },
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'Auth0',
    )
    .build();

  const swaggerCustomOptions: SwaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      oauth2RedirectUrl: `http://localhost:${configService.get('PORT')}/api/oauth2-redirect.html`,
      initOAuth: {
        clientId: configService.get('AUTH0_CLIENT_ID'),
        scopes: ['openid', 'profile', 'email', 'offline_access'],
      },
    },
  };

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(globalPrefix, app, document, swaggerCustomOptions);
  Logger.log(`Server swagger on /${globalPrefix}`, 'Swagger');

  return app;
};
