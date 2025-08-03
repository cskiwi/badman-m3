import { CompetitionDraw } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';

export interface CompetitionStandingSyncData {
  tournamentCode: string;
  drawCode: string;
}

@Injectable()
export class CompetitionStandingSyncService {
  private readonly logger = new Logger(CompetitionStandingSyncService.name);

  async processStandingSync(data: CompetitionStandingSyncData): Promise<void> {
    this.logger.log(`Processing competition standing sync`);
    const { drawCode } = data;

    try {
      // Find the competition draw
      const draw = await CompetitionDraw.findOne({
        where: { visualCode: drawCode },
        relations: ['subevent'],
      });

      if (!draw) {
        this.logger.warn(`Competition draw with code ${drawCode} not found, skipping standing sync`);
        return;
      }

      // Standings are calculated locally from game results
      // This is typically done by aggregating game results rather than syncing from external API
      draw.lastSync = new Date();
      await draw.save();
      this.logger.debug(`Standings for draw ${drawCode} are calculated locally from game results`);

      this.logger.log(`Completed competition standing sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition standing sync: ${errorMessage}`);
      throw error;
    }
  }
}
