import { ApolloDriver } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlModuleOptions, GraphQLModule as NestJsGql } from '@nestjs/graphql';

import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginSchemaReporting } from '@apollo/server/plugin/schemaReporting';
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting';
import { AuthorizationModule } from '@app/backend-authorization';
import {
  ClubPlayerMembershipResolver,
  ClubResolver,
  EventCompetitionResolver,
  PlayerResolver,
  RankingSystemResolver,
  SubEventCompetitionResolver,
  UserResolver,
} from './resolvers';

@Module({
  imports: [
    AuthorizationModule,
    NestJsGql.forRootAsync({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const plugins = [];
        const env = config.get<string>('NODE_ENV');

        if (env !== 'production') {
          plugins.push(
            ApolloServerPluginLandingPageLocalDefault({ footer: false }),
          );
        } else if (env === 'production') {
          plugins.push(
            ApolloServerPluginLandingPageProductionDefault({
              graphRef: config.get<string>('APOLLO_GRAPH_REF'),
              footer: true,
            }),
          );
          plugins.push(ApolloServerPluginSchemaReporting());

          plugins.push(
            ApolloServerPluginUsageReporting({
              sendVariableValues: { all: true },
            }),
          );
        }

        return {
          playground: false,
          debug: true,
          autoSchemaFile: true,
          sortSchema: true,
          context: ({ req }: { req: unknown }) => ({ req }),
          plugins,
        } as Omit<GqlModuleOptions, 'driver'>;
      },
    }),
  ],
  providers: [
    UserResolver,
    PlayerResolver,
    ClubPlayerMembershipResolver,
    ClubResolver,
    RankingSystemResolver,
    EventCompetitionResolver,
    SubEventCompetitionResolver,
  ],
})
export class GraphQLModule {}
