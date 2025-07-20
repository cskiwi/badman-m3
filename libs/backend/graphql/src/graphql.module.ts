import { ApolloServerPluginLandingPageLocalDefault, ApolloServerPluginLandingPageProductionDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginSchemaReporting } from '@apollo/server/plugin/schemaReporting';
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting';
import { AuthorizationModule } from '@app/backend-authorization';
import { ApolloDriver } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GqlModuleOptions, GraphQLModule as NestJsGql } from '@nestjs/graphql';
import {
  AvailabilityResolver,
  ClubPlayerMembershipResolver,
  ClubResolver,
  CommentResolver,
  CompetitionAssemblyResolver,
  CompetitionDrawResolver,
  CompetitionEncounterChangeDateResolver,
  CompetitionEncounterChangeResolver,
  CompetitionEncounterResolver,
  CompetitionEventResolver,
  CompetitionGroupSubEventMembershipResolver,
  CompetitionSubEventResolver,
  CourtResolver,
  CronJobResolver,
  EntryResolver,
  FaqResolver,
  GamePlayerMembershipResolver,
  GameResolver,
  GroupSubeventMembershipResolver,
  ImportFileResolver,
  IndexResolver,
  LocationEventMembershipResolver,
  LocationResolver,
  LogEntryResolver,
  NotificationResolver,
  PlayerPermissionsResolver,
  PlayerResolver,
  RankingGroupResolver,
  RankingLastPlaceResolver,
  RankingPlaceResolver,
  RankingPointResolver,
  RankingSystemResolver,
  RequestLinkResolver,
  RuleResolver,
  SearchResolver,
  ServiceResolver,
  SettingResolver,
  StandingResolver,
  TeamPlayerMembershipResolver,
  TeamResolver,
  TournamentDrawResolver,
  TournamentEventResolver,
  TournamentSubEventResolver,
  UserResolver,
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
          plugins.push(ApolloServerPluginLandingPageLocalDefault({ footer: false }));
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
    TeamResolver,
    TeamPlayerMembershipResolver,
  ],
})
export class GraphQLModule {}
