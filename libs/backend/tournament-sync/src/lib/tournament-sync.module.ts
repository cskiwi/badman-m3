import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { TournamentApiModule } from '@app/tournament-api';

import { TournamentSyncQueueModule } from './queues/tournament-sync.queue';
import { TournamentSyncService } from './services/tournament-sync.service';
import { TournamentDiscoveryProcessor } from './processors/tournament-discovery.processor';
import { CompetitionEventProcessor } from './processors/competition-event.processor';
import { TournamentEventProcessor } from './processors/tournament-event.processor';
import { TeamMatchingProcessor } from './processors/team-matching.processor';
import { TournamentSyncController } from './controllers/tournament-sync.controller';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    // Redis configuration is now handled by the parent application
    TournamentSyncQueueModule,
    TournamentApiModule,
  ],
  controllers: [TournamentSyncController],
  providers: [
    TournamentSyncService,
    TournamentDiscoveryProcessor,
    CompetitionEventProcessor,
    TournamentEventProcessor,
    TeamMatchingProcessor,
  ],
  exports: [
    TournamentSyncService,
  ],
})
export class TournamentSyncModule {}
