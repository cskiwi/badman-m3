/**
 * Standalone repair script: re-link CompetitionEncounter home/away teams.
 *
 * Walks every CompetitionEncounter, re-fetches its toernooi.nl TeamMatch data
 * per draw (one API call per draw, not per encounter), and re-runs the current
 * TeamMatchingService against the API team names. When the matcher now picks a
 * different Team than what the encounter currently references, the encounter's
 * homeTeamId / awayTeamId are updated. Games and ranking points are left
 * untouched on purpose — only the encounter-level team links are corrected.
 *
 * Usage (from workspace root):
 *
 *   # Dry run — log intended changes, write nothing:
 *   DRY_RUN=true npx nx run sync-worker:repair-encounters
 *
 *   # Narrow to the "Smash For Fun" cluster (see below):
 *   REPAIR_CURRENT_TEAM_NAME_LIKE="Smash For Fun" npx nx run sync-worker:repair-encounters
 *
 *   # Real run:
 *   npx nx run sync-worker:repair-encounters
 *
 * Environment flags:
 *   DRY_RUN=true                            Log only, don't save.
 *   REPAIR_LIMIT=100                        Hard cap on encounters inspected.
 *   REPAIR_CURRENT_TEAM_NAME_LIKE="Smash"   Only re-evaluate encounters whose
 *                                           current home/away team name
 *                                           contains this substring (case-
 *                                           insensitive). Useful to narrow the
 *                                           repair to known-bad clusters.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { EncounterTeamRepairService } from '@app/backend-sync';
import { CompetitionEncounter } from '@app/models';
import { createWinstonLogger } from '@apps/shared';
import { RepairModule } from './app/repair.module';

function parseBool(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
}

function parseIntEnv(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * DatabaseModule's initializeDataSource kicks off `datasource.initialize()`
 * as a fire-and-forget promise. In the minimal RepairModule there is no
 * other async work to mask that, so BaseEntity queries can run before the
 * DataSource is attached. Wait for it explicitly.
 */
async function waitForDataSource(timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // CompetitionEncounter extends BaseEntity; `dataSource` is populated once
    // TypeORM calls `useDataSource` during DataSource.initialize().
    const ds = (CompetitionEncounter as unknown as { dataSource?: { isInitialized: boolean } }).dataSource;
    if (ds?.isInitialized) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`DataSource was not initialized within ${timeoutMs}ms`);
}

async function bootstrap() {
  // Winston logger with file transports — mirrors what main.ts does for the
  // sync-worker so repair runs also leave a persistent record under ./logs.
  const winstonLogger = createWinstonLogger({ name: 'repair-encounters', logDir: 'logs' });

  const app = await NestFactory.createApplicationContext(RepairModule, {
    logger: winstonLogger,
  });

  const logger = new Logger('RepairCompetitionEncounterTeams');

  try {
    await waitForDataSource();

    const repair = app.get(EncounterTeamRepairService);

    const dryRun = parseBool(process.env.DRY_RUN);
    const limit = parseIntEnv(process.env.REPAIR_LIMIT);
    const currentTeamNameLike = process.env.REPAIR_CURRENT_TEAM_NAME_LIKE?.trim() || undefined;

    const result = await repair.repairCompetitionEncounterTeams({
      dryRun,
      limit,
      currentTeamNameLike,
    });

    logger.log(`Repair result: ${JSON.stringify(result)}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Repair script failed: ${message}`, error instanceof Error ? error.stack : undefined);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during repair bootstrap', err);
  process.exit(1);
});
