import { Module } from '@nestjs/common';
import { TournamentApiModule } from '@app/backend-tournament-api';

import { SyncQueueModule } from './queues/sync.queue';
import { SyncService } from './services/sync.service';
import { TournamentDiscoveryProcessor } from './processors/tournament-discovery.processor';
import { CompetitionEventProcessor } from './processors/competition-event.processor';
import { TournamentEventProcessor } from './processors/tournament-event.processor';
import { TeamMatchingProcessor } from './processors/team-matching.processor';

@Module({
  imports: [
    SyncQueueModule,
    TournamentApiModule,
  ],
  providers: [
    TournamentDiscoveryProcessor,
    CompetitionEventProcessor,
    TournamentEventProcessor,
    TeamMatchingProcessor,
    SyncService, // Processors need SyncService for queueing jobs
  ],
  exports: [
    TournamentDiscoveryProcessor,
    CompetitionEventProcessor,
    TournamentEventProcessor,
    TeamMatchingProcessor,
  ],
})
export class SyncProcessorsModule {}
