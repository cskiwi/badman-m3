import { CompetitionDraw } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';

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

      await updateProgress?.(100);
      this.logger.log(`Completed competition standing sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition standing sync: ${errorMessage}`);
      throw error;
    }
  }
}
