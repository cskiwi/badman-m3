import {
  Club,
  ClubPlayerMembership,
  Game,
  GamePlayerMembership,
  Player,
  RankingGroup,
  RankingLastPlace,
  RankingSystem,
  RankingSystemRankingGroupMembership,
  Team,
  TeamPlayerMembership,
} from '@app/models';
import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions';

config();

const addMigrations = process.env['RUN_MIGRATIONS']?.trim() === 'true';
const dbType = process.env['DB_TYPE']?.trim();

const entities = [
  Player,
  RankingSystem,
  RankingGroup,
  RankingSystemRankingGroupMembership,
  RankingLastPlace,
  Club,
  ClubPlayerMembership,
  Game,
  GamePlayerMembership,
  Team,
  TeamPlayerMembership,
];

export let ormConfig: DataSourceOptions;

if (dbType === 'sqlite') {
  ormConfig = {
    type: 'sqlite',
    database: process.env['DB_DATABASE'],
    synchronize: process.env['DB_SYNCHRONIZE'] === 'true',
  } as SqliteConnectionOptions;
} else if (dbType === 'postgres') {
  ormConfig = {
    type: 'postgres',
    host: process.env['DB_IP'],
    port: process.env['DB_PORT'] ? parseInt(process.env['DB_PORT']) : 5432,
    username: process.env['DB_USER'],
    password: process.env['DB_PASSWORD'],
    database: process.env['DB_DATABASE'],
    ssl:
      process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
    migrationsTableName: 'typeorm_migrations',
    applicationName: 'badman',
    options: { trustServerCertificate: true },
    migrations: addMigrations
      ? ['libs/backend/database/src/migrations/*.ts']
      : undefined,
    synchronize: false,
    migrationsRun: false,
  } as PostgresConnectionOptions;
} else {
  throw new Error(
    'Unsupported DB_TYPE. Please specify either "sqlite" or "postgres".',
  );
}

const datasource = new DataSource({
  ...ormConfig,
  entities,
});
datasource.initialize();
export default datasource;
