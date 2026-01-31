import * as Models from '@app/models';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

// Extract all entity classes from the models package
// An entity class extends BaseEntity and is decorated with @Entity
const entities = Object.values(Models).filter((value) => {
  // Exclude enums and non-function values
  if (typeof value !== 'function' || !value.prototype) return false;

  // Exclude TypeScript enums (they're objects with both numeric and string keys)
  if (typeof value === 'object' && Object.keys(value).some(k => !isNaN(Number(k)))) return false;

  // Check if it extends BaseEntity (TypeORM entity base class)
  let proto = value.prototype;
  while (proto) {
    if (proto.constructor.name === 'BaseEntity') return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}) as any[];

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
      applicationName: 'Gladman',
      options: { trustServerCertificate: true },
      migrations: addMigrations ? ['libs/backend/database/src/migrations/*.ts'] : undefined,
      synchronize: false,
      migrationsRun: false,
      cli: {
        migrationsDir: 'libs/backend/database/src/migrations',
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
