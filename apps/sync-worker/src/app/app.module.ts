import { SyncModule, SyncProcessorsModule } from '@app/backend-sync';
import { TournamentApiModule } from '@app/backend-tournament-api';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '@app/backend-database';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    ScheduleModule.forRoot(),
    TournamentApiModule,
    SyncModule,
    SyncProcessorsModule, // Add processors for background job processing
  ],
})
export class AppModule {}
