import { CompetitionDraw } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { Job, WaitingChildrenError } from 'bullmq';

export interface CompetitionStandingSyncData {
  tournamentCode: string;
  drawCode: string;
}

@Injectable()
export class CompetitionStandingSyncService {
  private readonly logger = new Logger(CompetitionStandingSyncService.name);

  async processStandingSync(
    data: CompetitionStandingSyncData,
    updateProgress?: (progress: number) => Promise<void>,
    job?: Job,
    token?: string,
  ): Promise<void> {
    this.logger.log(`Processing competition standing sync`);
    await updateProgress?.(10);
    const { drawCode } = data;

    try {
      // Find the competition draw
      await updateProgress?.(20);
      const draw = await CompetitionDraw.findOne({
        where: { visualCode: drawCode },
        relations: ['subevent'],
      });
      await updateProgress?.(40);

      if (!draw) {
        this.logger.warn(`Competition draw with code ${drawCode} not found, skipping standing sync`);
        return;
      }

      // Standings are calculated locally from game results
      // This is typically done by aggregating game results rather than syncing from external API
      await updateProgress?.(80);
      draw.lastSync = new Date();
      await draw.save();
      this.logger.debug(`Standings for draw ${drawCode} are calculated locally from game results`);
      await updateProgress?.(90);

      // Check if we should wait for children using BullMQ pattern
      if (job && token) {
        const shouldWait = await job.moveToWaitingChildren(token);
        if (shouldWait) {
          this.logger.log(`Competition standing sync waiting for child jobs`);
          throw new WaitingChildrenError();
        }
      }

      this.logger.log(`Completed competition standing sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition standing sync: ${errorMessage}`, error);
      throw error;
    }
  }
}
