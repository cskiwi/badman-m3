import { CompetitionEncounter } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IsNull, MoreThanOrEqual, Not } from 'typeorm';
import { StructureSyncJobData } from '../../queues/sync.queue';
import { SyncService } from '../../services/sync.service';

@Injectable()
export class CompetitionSyncService {
  private readonly logger = new Logger(CompetitionSyncService.name);

  constructor(private readonly syncService: SyncService) {}

  /**
   * Find all encounters from the past month - both those without scores
   * (pending results) and those with scores (may need updates) - then
   * queue an encounter sync for each, deduplicating by encounter ID.
   */
  async processStructureSync(
    job: Job<StructureSyncJobData>,
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    await updateProgress(0);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Encounters from the past month without a score yet (primary targets)
    const pendingEncounters = await CompetitionEncounter.find({
      where: { date: MoreThanOrEqual(oneMonthAgo), homeScore: IsNull() },
      select: ['id'],
    });

    // Encounters from the past month that already have scores
    const scoredEncounters = await CompetitionEncounter.find({
      where: { date: MoreThanOrEqual(oneMonthAgo), homeScore: Not(IsNull()) },
      select: ['id'],
    });

    // Combine and deduplicate
    const uniqueIds = [...new Set([...pendingEncounters.map((e) => e.id), ...scoredEncounters.map((e) => e.id)])];

    this.logger.log(
      `Found ${uniqueIds.length} encounters to sync ` +
        `(${pendingEncounters.length} pending, ${scoredEncounters.length} scored)`,
    );

    if (uniqueIds.length === 0) {
      await updateProgress(100);
      return;
    }

    let queued = 0;
    for (let i = 0; i < uniqueIds.length; i++) {
      const encounterId = uniqueIds[i];
      try {
        await this.syncService.queueEncounterSync(encounterId);
        queued++;
        this.logger.debug(`Queued sync for encounter: ${encounterId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to queue sync for encounter ${encounterId}: ${errorMessage}`);
      }
      await updateProgress(Math.round(((i + 1) / uniqueIds.length) * 100));
    }

    this.logger.log(`Queued sync for ${queued}/${uniqueIds.length} encounters`);
  }
}
