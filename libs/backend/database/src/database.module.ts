import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule, ConfigService } from '@nestjs/config';
import initializeDataSource, { getDbConfig } from './orm.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        initializeDataSource(configService);

        return getDbConfig(configService);
      },
    }),
  ],
})
export class DatabaseModule {}
