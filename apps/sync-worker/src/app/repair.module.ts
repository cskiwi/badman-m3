/**
 * Minimal module for the encounter team-link repair script.
 *
 * Loads only what the repair needs (database + tournament API + team
 * matching + repair service) and deliberately avoids importing
 * `SyncProcessorsModule`, which registers BullMQ queue consumers. That way
 * running the repair does NOT pick up unrelated queued sync jobs, keeping
 * the log output focused and avoiding side-effect writes from other
 * processors.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/backend-database';
import { TournamentApiModule } from '@app/backend-tournament-api';
import { EncounterTeamRepairService, TeamMatchingService } from '@app/backend-sync';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    TournamentApiModule,
  ],
  providers: [TeamMatchingService, EncounterTeamRepairService],
})
export class RepairModule {}
