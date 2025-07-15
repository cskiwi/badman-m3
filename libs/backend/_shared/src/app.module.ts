import { AuthorizationModule } from '@app/backend-authorization';
import { DatabaseModule } from '@app/backend-database';
import { GraphQLModule } from '@app/backend-graphql';
import { HealthModule } from '@app/backend-health';
import { SeoModule } from '@app/backend-seo';
import { ISearchConfig, SearchModule } from '@app/backend-search';
import { TranslateModule } from '@app/backend-translate';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
    }),
    DatabaseModule,
    AuthorizationModule,
    GraphQLModule,
    SeoModule,
    HealthModule,
    TranslateModule,
    ScheduleModule.forRoot(),
    SearchModule.forRootAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const getEnvVar = <T>(key: string, defaultValue?: string) => (configService ? configService.get<T>(key) : process.env[key] || defaultValue);

        return {
          typesense: {
            nodes: [
              {
                host: getEnvVar<string>('TYPESENSE_HOST'),
                port: getEnvVar<number>('TYPESENSE_PORT'),
                protocol: getEnvVar<string>('TYPESENSE_PROTOCOL'),
              },
            ],
            apiKey: getEnvVar<string>('TYPESENSE_API_KEY'),
          },
        } as ISearchConfig;
      },
    }),
  ],
  controllers: [],
})
export class AppModule {}
