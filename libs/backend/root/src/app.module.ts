import { Module } from '@nestjs/common';
import { RoutesGeneratorModule } from '@app/backend-routes-generator';
import { AuthorizationModule } from '@app/backend-authorization';
import { DatabaseModule } from '@app/backend-database';
import { GraphQLModule } from '@app/backend-graphql';
import { HealthModule } from '@app/backend-health';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    RoutesGeneratorModule, // Server imports
    ConfigModule,
    DatabaseModule,
    AuthorizationModule,
    GraphQLModule,
    HealthModule,
  ],
  controllers: [],
})
export class AppModule {}

