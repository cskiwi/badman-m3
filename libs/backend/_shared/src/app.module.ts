import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@app/backend-authorization';
import { DatabaseModule } from '@app/backend-database';
import { GraphQLModule } from '@app/backend-graphql';
import { HealthModule } from '@app/backend-health';
import { SeoModule } from '@app/backend-seo';
import { ConfigModule } from '@nestjs/config';
import { TranslateModule } from '@app/backend-translate';
import { SearchModule } from '@app/backend-serach';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    DatabaseModule,
    AuthorizationModule,
    GraphQLModule,
    SeoModule,
    HealthModule,
    TranslateModule,
    SearchModule.forRoot({
      algolia: {
        appId: process.env['ALGOLIA_APP_ID'] ?? '',
        apiKey: process.env['ALGOLIA_API_KEY'] ?? '',
      },
      typesense: {
        nodes: [
          {
            host: process.env['TYPESENSE_HOST'] ?? '',
            port: Number(process.env['TYPESENSE_PORT']) ?? 443,
            protocol: process.env['TYPESENSE_PROTOCOL'] ?? 'http',
          },
        ],
        apiKey: process.env['TYPESENSE_API_KEY'] ?? '',
      },
    }),
  ],
  controllers: [],
})
export class AppModule {}
