import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import initializeDataSource from './orm.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const { config } = initializeDataSource();

        return config;
      },
    }),
  ],
})
export class DatabaseModule {}
