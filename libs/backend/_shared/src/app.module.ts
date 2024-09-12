import { AuthorizationModule } from '@app/backend-authorization';
import { DatabaseModule } from '@app/backend-database';
import { GraphQLModule } from '@app/backend-graphql';
import { HealthModule } from '@app/backend-health';
import { SeoModule } from '@app/backend-seo';
import { ISearchConfig, SearchModule } from '@app/backend-serach';
import { TranslateModule } from '@app/backend-translate';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
    SearchModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          algolia: {
            appId: configService.get<string>('ALGOLIA_APP_ID'),
            apiKey: configService.get<string>('ALGOLIA_API_KEY'),
          },
          typesense: {
            nodes: [
              {
                host: configService.get<string>('TYPESENSE_HOST'),
                port: configService.get<number>('TYPESENSE_PORT'),
                protocol: configService.get<string>('TYPESENSE_PROTOCOL'),
              },
            ],
            apiKey: configService.get<string>('TYPESENSE_API_KEY'),
          },
        } as ISearchConfig;
      },
    }),
  ],
  controllers: [],
})
export class AppModule {}
