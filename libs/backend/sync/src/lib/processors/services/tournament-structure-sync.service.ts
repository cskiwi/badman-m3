import { TournamentEvent } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { LessThan, MoreThan } from 'typeorm';
import { TournamentSyncJobData } from '../../queues/sync.queue';
import { SyncService } from '../../services/sync.service';

@Injectable()
export class TournamentSyncService {
  private readonly logger = new Logger(TournamentSyncService.name);

  constructor(private readonly syncService: SyncService) {}

  /**
   * Find all tournaments that are current or upcoming (within 1 month)
   * and not yet too old (ended within last 2 weeks), then queue a full sync for each.
   *
   * Uses closeDate as a proxy for tournament end date (set to EndDate when
   * OnlineEntryEndDate is unavailable during discovery).
   */
  async processStructureSync(
    job: Job<TournamentSyncJobData>,
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    await updateProgress(0);

    const now = new Date();

    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Tournaments starting within 1 month from now AND ending no more than 2 weeks ago
    const tournaments = await TournamentEvent.find({
      where: {
        firstDay: LessThan(oneMonthFromNow),
        closeDate: MoreThan(twoWeeksAgo),
      },
      select: ['id', 'name', 'visualCode'],
    });

    this.logger.log(`Found ${tournaments.length} tournaments to queue for full sync`);

    if (tournaments.length === 0) {
      await updateProgress(100);
      return;
    }

    let queued = 0;
    for (let i = 0; i < tournaments.length; i++) {
      const tournament = tournaments[i];
      try {
        await this.syncService.queueEventSync(tournament.id, true);
        queued++;
        this.logger.debug(`Queued full sync for tournament: ${tournament.name} (${tournament.visualCode})`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to queue sync for tournament ${tournament.id}: ${errorMessage}`);
      }
      await updateProgress(Math.round(((i + 1) / tournaments.length) * 100));
    }

    this.logger.log(`Queued full sync for ${queued}/${tournaments.length} tournaments`);
  }
}
