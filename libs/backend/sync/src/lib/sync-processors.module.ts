import { TournamentApiModule } from '@app/backend-tournament-api';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import {
  CompetitionDrawSyncService,
  CompetitionEncounterSyncService,
  CompetitionEntrySyncService,
  CompetitionEventProcessor,
  CompetitionEventSyncService,
  CompetitionGameSyncService,
  CompetitionPlanningService,
  CompetitionStandingSyncService,
  CompetitionSubEventSyncService,
  TeamMatchingProcessor,
  TeamSyncService,
  DiscoveryProcessor,
  TournamentDrawSyncService,
  TournamentEntrySyncService,
  TournamentEventProcessor,
  TournamentEventSyncService,
  TournamentGameSyncService,
  TournamentPlanningService,
  TournamentStandingSyncService,
  TournamentSubEventSyncService,
} from './processors';
import { ALL_SYNC_QUEUES, COMPETITION_EVENT_QUEUE, TOURNAMENT_EVENT_QUEUE } from './queues/sync.queue';
import { SyncService } from './services/sync.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Use CACHE_* environment variables to match the project's configuration
        const host = configService.get('CACHE_HOST') || configService.get('REDIS_HOST') || 'localhost';
        const port = configService.get<number>('CACHE_PORT') || configService.get<number>('REDIS_PORT') || 6379;
        const password = configService.get('CACHE_PASSWORD') || configService.get('REDIS_PASSWORD');
        const db = configService.get<number>('CACHE_DB') || configService.get<number>('REDIS_DB') || 0;

        console.log(`Connecting to Redis at ${host}:${port} (db: ${db})`);

        return {
          connection: {
            host,
            port,
            password,
            db,
          },
        };
      },
      inject: [ConfigService],
    }),
    // Register all queues for processors
    ...ALL_SYNC_QUEUES.map((queueName) =>
      BullModule.registerQueue({
        name: queueName,
        defaultJobOptions: {
          removeOnComplete: {
            age: 24 * 3600, // keep up to 1 day
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // keep up to 1 week
          },
        },
      }),
    ),
    // Register flow producers for sub-option sync capabilities
    BullModule.registerFlowProducer({
      name: TOURNAMENT_EVENT_QUEUE,
    }),
    BullModule.registerFlowProducer({
      name: COMPETITION_EVENT_QUEUE,
    }),
    TournamentApiModule,
  ],
  providers: [
    SyncService, // Add SyncService so processors can queue additional jobs
    DiscoveryProcessor,
    CompetitionEventProcessor,
    TournamentEventProcessor,
    TeamMatchingProcessor,
    // Competition sync services
    CompetitionGameSyncService,
    CompetitionEventSyncService,
    CompetitionSubEventSyncService,
    CompetitionDrawSyncService,
    CompetitionEntrySyncService,
    CompetitionEncounterSyncService,
    CompetitionStandingSyncService,
    CompetitionPlanningService,
    // Tournament sync services
    TournamentGameSyncService,
    TournamentEventSyncService,
    TournamentSubEventSyncService,
    TournamentDrawSyncService,
    TournamentEntrySyncService,
    TournamentStandingSyncService,
    TournamentPlanningService,
    // Shared sync services
    TeamSyncService,
  ],
})
export class SyncProcessorsModule {}
