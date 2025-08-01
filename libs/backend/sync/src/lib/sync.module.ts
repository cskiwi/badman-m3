import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { TournamentApiModule } from '@app/backend-tournament-api';

import { SyncQueueModule } from './queues/sync.queue';
import { SyncService } from './services/sync.service';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    // Redis configuration is now handled by the parent application
    SyncQueueModule,
    TournamentApiModule,
  ],
  providers: [
    SyncService,
  ],
  exports: [
    SyncService,
  ],
})
export class SyncModule {}
