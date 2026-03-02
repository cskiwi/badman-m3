import { CompetitionEncounter } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { And, IsNull, LessThan, MoreThanOrEqual } from 'typeorm';
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
  async processSync(
    job: Job<StructureSyncJobData>,
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    await updateProgress(0);

    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    dayAfterTomorrow.setHours(0, 0, 0, 0);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // All encounters from the last 2 weeks (regardless of score), up to today
    const recentEncounters = await CompetitionEncounter.find({
      where: { date: And(MoreThanOrEqual(twoWeeksAgo), LessThan(dayAfterTomorrow)) },
      select: ['id'],
    });

    // Encounters between 1 month ago and 2 weeks ago without a score
    const pendingOlderEncounters = await CompetitionEncounter.find({
      where: { date: And(MoreThanOrEqual(oneMonthAgo), LessThan(twoWeeksAgo)), homeScore: IsNull() },
      select: ['id'],
    });

    // Combine and deduplicate
    const uniqueIds = [
      ...new Set([...recentEncounters.map((e) => e.id), ...pendingOlderEncounters.map((e) => e.id)]),
    ];

    this.logger.log(
      `Found ${uniqueIds.length} encounters to sync ` +
        `(${recentEncounters.length} recent 2w, ${pendingOlderEncounters.length} pending older)`,
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
