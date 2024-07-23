import { Module } from '@nestjs/common';
import { RoutesGeneratorModule } from '@app/backend-routes-generator';
import { AuthorizationModule } from '@app/backend-authorization';
import { DatabaseModule } from '@app/backend-database';
import { GraphQLModule } from '@app/backend-graphql';
import { HealthModule } from '@app/backend-health';
import { SeoModule } from '@app/backend-seo';
import { ConfigModule } from '@nestjs/config';
import { TranslateModule } from '@app/backend-translate';

@Module({
  imports: [
    RoutesGeneratorModule, // Server imports
    ConfigModule,
    DatabaseModule,
    AuthorizationModule,
    GraphQLModule,
    SeoModule,
    HealthModule,
    TranslateModule,
  ],
  controllers: [],
})
export class AppModule {}
