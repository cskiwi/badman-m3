import { Module } from '@nestjs/common';
import { TournamentApiModule } from '@app/backend-tournament-api';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { TournamentDiscoveryProcessor } from './processors/tournament-discovery.processor';
import { CompetitionEventProcessor } from './processors/competition-event.processor';
import { TournamentEventProcessor } from './processors/tournament-event.processor';
import { TeamMatchingProcessor } from './processors/team-matching.processor';
import { SyncService } from './services/sync.service';
import { ALL_SYNC_QUEUES } from './queues/sync.queue';

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
      name: 'competition-sync',
    }),
    BullModule.registerFlowProducer({
      name: 'tournament-sync',
    }),
    TournamentApiModule,
  ],
  providers: [
    SyncService, // Add SyncService so processors can queue additional jobs
    TournamentDiscoveryProcessor,
    CompetitionEventProcessor,
    TournamentEventProcessor,
    TeamMatchingProcessor,
  ],
})
export class SyncProcessorsModule {}
