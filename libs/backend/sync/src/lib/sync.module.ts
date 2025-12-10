import { TournamentApiModule } from '@app/backend-tournament-api';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { BullModule } from '@nestjs/bullmq';
import { SyncGateway } from './gateways/sync.gateway';
import { TournamentLiveGateway } from './gateways/tournament-live.gateway';
import { SyncService } from './services/sync.service';
import {
  SyncEventsListener,
  TournamentDiscoveryEventsListener,
  CompetitionEventEventsListener,
  TournamentEventEventsListener,
  TeamMatchingEventsListener,
} from './listeners/sync-events.listener';
import { ALL_SYNC_QUEUES, COMPETITION_EVENT_QUEUE, TOURNAMENT_EVENT_QUEUE } from './queues/sync.queue';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Use CACHE_* environment variables to match the project's configuration
        const host = configService.get('CACHE_HOST') || configService.get('REDIS_HOST') || 'localhost';
        const port = configService.get<number>('CACHE_PORT') || configService.get<number>('REDIS_PORT') || 6379;
        const password = configService.get('CACHE_PASSWORD') || configService.get('REDIS_PASSWORD');
        const db = configService.get<number>('CACHE_DB') || configService.get<number>('REDIS_DB') || 0;

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
    // Register all queues dynamically with retry configuration
    ...ALL_SYNC_QUEUES.map((queueName) =>
      BullModule.registerQueue({
        name: queueName,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
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
    SyncService,
    SyncGateway,
    TournamentLiveGateway,
    SyncEventsListener,
    TournamentDiscoveryEventsListener,
    CompetitionEventEventsListener,
    TournamentEventEventsListener,
    TeamMatchingEventsListener,
  ],
  exports: [SyncService, SyncGateway, TournamentLiveGateway],
})
export class SyncModule {}
