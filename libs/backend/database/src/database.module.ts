import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ormConfig } from './orm.config';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...ormConfig,
    }),
  ],
})
export class DatabaseModule {}
