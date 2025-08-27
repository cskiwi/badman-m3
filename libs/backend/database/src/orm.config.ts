import {
  Availability,
  Claim,
  Club,
  ClubPlayerMembership,
  Comment,
  CompetitionAssembly,
  CompetitionDraw,
  CompetitionEncounter,
  CompetitionEncounterChange,
  CompetitionEncounterChangeDate,
  CompetitionEvent,
  CompetitionSubEvent,
  Court,
  Entry,
  Faq,
  Game,
  GamePlayerMembership,
  Location,
  Notification,
  Player,
  PlayerClaimMembership,
  PlayerRoleMembership,
  RankingGroup,
  RankingLastPlace,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  RankingSystemRankingGroupMembership,
  RequestLink,
  Role,
  RoleClaimMembership,
  Setting,
  Standing,
  Team,
  TeamPlayerMembership,
  TournamentDraw,
  TournamentEvent,
  TournamentSubEvent,
} from '@app/models';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

const entities = [
  Player,
  RankingSystem,
  RankingGroup,
  RankingSystemRankingGroupMembership,
  RankingLastPlace,
  RankingPoint,
  RankingPlace,
  Club,
  ClubPlayerMembership,
  Game,
  GamePlayerMembership,
  Team,
  TeamPlayerMembership,

  CompetitionEvent,
  TournamentEvent,
  TournamentSubEvent,
  TournamentDraw,
  Entry,
  Standing,
  CompetitionEncounter,
  CompetitionEncounterChange,
  CompetitionEncounterChangeDate,
  CompetitionDraw,
  CompetitionSubEvent,
  CompetitionAssembly,

  Location,
  Court,
  Availability,

  Comment,
  Faq,
  Notification,
  RequestLink,
  Setting,

  Role,
  Claim,
  PlayerRoleMembership,
  RoleClaimMembership,
  PlayerClaimMembership,
];

export function getDbConfig(configService?: ConfigService): DataSourceOptions {
  const getEnvVar = (key: string, defaultValue?: string) => (configService ? configService.get<string>(key) : process.env[key] || defaultValue);

  const addMigrations = getEnvVar('RUN_MIGRATIONS')?.trim() === 'true';
  const dbType = getEnvVar('DB_TYPE')?.trim();
  let config: DataSourceOptions;

  console.log('DB_TYPE:', dbType);
  console.log('RUN_MIGRATIONS:', addMigrations);

  if (dbType === 'sqlite') {
    config = {
      type: 'sqlite',
      database: getEnvVar('DB_DATABASE'),
      synchronize: getEnvVar('DB_SYNCHRONIZE') === 'true',
    } as DataSourceOptions;
  } else if (dbType === 'postgres') {
    config = {
      type: 'postgres',
      host: getEnvVar('DB_IP'),
      port: getEnvVar('DB_PORT') ? parseInt(getEnvVar('DB_PORT') as string) : 5432,
      username: getEnvVar('DB_USER'),
      password: getEnvVar('DB_PASSWORD'),
      database: getEnvVar('DB_DATABASE'),
      ssl: getEnvVar('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      migrationsTableName: 'typeorm_migrations',
      applicationName: 'badman',
      options: { trustServerCertificate: true },
      migrations: addMigrations ? ['libs/backend/database/src/migrations/*.ts'] : undefined,
      synchronize: false,
      migrationsRun: false,
      cli: {
        migrationsDir: 'libs/backend/database/src/migrations'
      },
      // logging: true,
    } as DataSourceOptions;
  } else {
    throw new Error('Unsupported DB_TYPE. Please specify either "sqlite" or "postgres".');
  }

  return config;
}

export function initializeDataSource(configService?: ConfigService) {
  const config = getDbConfig(configService);

  console.log('ORM Config:', config);

  const datasource = new DataSource({
    ...config,
    entities,
  });
  datasource.initialize();

  return {
    datasource,
    config,
  };
}
