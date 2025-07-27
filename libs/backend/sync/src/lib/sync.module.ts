import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { TournamentApiModule } from '@app/tournament-api';

import { SyncQueueModule } from './queues/sync.queue';
import { SyncService } from './services/sync.service';
import { TournamentDiscoveryProcessor } from './processors/tournament-discovery.processor';
import { CompetitionEventProcessor } from './processors/competition-event.processor';
import { TournamentEventProcessor } from './processors/tournament-event.processor';
import { TeamMatchingProcessor } from './processors/team-matching.processor';

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
    TournamentDiscoveryProcessor,
    CompetitionEventProcessor,
    TournamentEventProcessor,
    TeamMatchingProcessor,
  ],
  exports: [
    SyncService,
  ],
})
export class SyncModule {}
