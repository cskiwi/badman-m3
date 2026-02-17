import { SyncProcessorsModule } from '@app/backend-sync';
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
    // Only import SyncProcessorsModule for workers — SyncModule is for the API server.
    // Importing both caused duplicate BullModule queue registrations with conflicting
    // defaultJobOptions (attempts, removeOnComplete) and duplicate SyncService/FlowProducer instances.
    SyncProcessorsModule,
  ],
})
export class AppModule {}
