import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { TournamentApiModule } from '@app/tournament-api';
import { SyncModule } from '@app/sync';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.CACHE_HOST || 'localhost',
        port: parseInt(process.env.CACHE_PORT || '6379', 10),
        password: process.env.CACHE_PASSWORD,
        db: parseInt(process.env.CACHE_DB || '0', 10),
      },
    }),
    TournamentApiModule,
    SyncModule,
  ],
})
export class AppModule {}
