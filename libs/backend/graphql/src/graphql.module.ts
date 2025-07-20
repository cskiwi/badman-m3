import { ApolloDriver } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlModuleOptions, GraphQLModule as NestJsGql } from '@nestjs/graphql';
import { ConfigModule } from '@nestjs/config';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginSchemaReporting } from '@apollo/server/plugin/schemaReporting';
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting';
import { AuthorizationModule } from '@app/backend-authorization';
import {
  TournamentEventResolver,
  TournamentSubEventResolver,
  TournamentDrawResolver,
  GroupSubeventMembershipResolver,
  LocationEventMembershipResolver,
  ClubPlayerMembershipResolver,
  ClubResolver,
  CompetitionEventResolver,
  CompetitionSubEventResolver,
  CompetitionDrawResolver,
  CompetitionEncounterResolver,
  CompetitionAssemblyResolver,
  CompetitionGroupSubEventMembershipResolver,
  GamePlayerMembershipResolver,
  GameResolver,
  IndexResolver,
  PlayerResolver,
  RankingSystemResolver,
  RankingPointResolver,
  RankingPlaceResolver,
  RankingLastPlaceResolver,
  RankingGroupResolver,
  UserResolver,
  PlayerPermissionsResolver,
  CommentResolver,
  FaqResolver,
  RequestLinkResolver,
  SearchResolver,
  AvailabilityResolver,
  CourtResolver,
  EntryResolver,
  LocationResolver,
  StandingResolver,
  CompetitionEncounterChangeResolver,
  CompetitionEncounterChangeDateResolver,
  ImportFileResolver,
  NotificationResolver,
  SettingResolver,
  CronJobResolver,
  LogEntryResolver,
  RuleResolver,
  ServiceResolver,
} from './resolvers';

@Module({
  imports: [
    ConfigModule,
    AuthorizationModule,
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
    GamePlayerMembershipResolver,
    GameResolver,
    IndexResolver,
    RankingSystemResolver,
    RankingPointResolver,
    RankingPlaceResolver,
    RankingLastPlaceResolver,
    RankingGroupResolver,
    CompetitionEventResolver,
    CompetitionSubEventResolver,
    CompetitionDrawResolver,
    CompetitionEncounterResolver,
    CompetitionAssemblyResolver,
    CompetitionGroupSubEventMembershipResolver,
    TournamentEventResolver,
    TournamentSubEventResolver,
    TournamentDrawResolver,
    GroupSubeventMembershipResolver,
    LocationEventMembershipResolver,
    PlayerPermissionsResolver,
    CommentResolver,
    FaqResolver,
    RequestLinkResolver,
    SearchResolver,
    AvailabilityResolver,
    CourtResolver,
    EntryResolver,
    LocationResolver,
    StandingResolver,
    CompetitionEncounterChangeResolver,
    CompetitionEncounterChangeDateResolver,
    ImportFileResolver,
    NotificationResolver,
    SettingResolver,
    CronJobResolver,
    LogEntryResolver,
    RuleResolver,
    ServiceResolver,
  ],
})
export class GraphQLModule {}
