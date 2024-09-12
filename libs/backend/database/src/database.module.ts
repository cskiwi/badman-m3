import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigService } from '@nestjs/config';
import { initializeDataSource } from './orm.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const { config } = initializeDataSource(configService);

        return config;
      },
    }),
  ],
})
export class DatabaseModule {}
