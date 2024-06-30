import { ApolloDriver } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GqlModuleOptions, GraphQLModule as NestJsGql } from '@nestjs/graphql';


import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginSchemaReporting } from '@apollo/server/plugin/schemaReporting';
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting';
import { AuthorizationModule } from '@app/backend-authorization';
import { UserResolver } from './resolvers/user.resolver';

@Module({
  imports: [
    AuthorizationModule,
    ConfigModule,
    NestJsGql.forRootAsync({
      driver: ApolloDriver,
      imports: [ConfigModule],
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
          // plugins.push(
          //   OperationRegistry({
          //     forbidUnregisteredOperations: true,
          //   }),
          // );
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
  ],
})
export class GraphQLModule {}
