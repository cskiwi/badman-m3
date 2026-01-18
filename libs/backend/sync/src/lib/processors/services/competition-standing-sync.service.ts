import { CompetitionDraw, CompetitionEvent as CompetitionEventModel, CompetitionSubEvent } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { Job, WaitingChildrenError } from 'bullmq';

export interface CompetitionStandingSyncData {
  tournamentCode: string;
  eventCode?: string;
  drawCode: string;
}

@Injectable()
export class CompetitionStandingSyncService {
  private readonly logger = new Logger(CompetitionStandingSyncService.name);

  async processStandingSync(job: Job<CompetitionStandingSyncData>, updateProgress: (progress: number) => Promise<void>, token: string): Promise<void> {
    this.logger.log(`Processing competition standing sync`);
    await updateProgress(10);
    const { tournamentCode, eventCode, drawCode } = job.data;

    try {
      // Find the competition event first to get proper context
      await updateProgress(15);
      const competitionEvent = await CompetitionEventModel.findOne({
        where: { visualCode: tournamentCode },
      });
      await updateProgress(20);

      if (!competitionEvent) {
        this.logger.warn(`Competition with code ${tournamentCode} not found, skipping standing sync`);
        return;
      }

      this.logger.debug(`Found competition: ${competitionEvent.id} with code ${tournamentCode}`);

      // Use eventCode to find the specific sub-event when available, avoiding ambiguity
      // when multiple sub-events have draws with the same visualCode
      const subEvent = eventCode
        ? await CompetitionSubEvent.findOne({
            where: {
              visualCode: eventCode,
              competitionEvent: {
                id: competitionEvent.id,
              },
            },
          })
        : null;

      // Find the draw with competition context to avoid visualCode ambiguity
      await updateProgress(25);
      const draw = await CompetitionDraw.findOne({
        where: {
          visualCode: drawCode,
          ...(subEvent
            ? { subeventId: subEvent.id }
            : {
                competitionSubEvent: {
                  competitionEvent: {
                    id: competitionEvent.id,
                  },
                },
              }),
        },
        relations: ['competitionSubEvent', 'competitionSubEvent.competitionEvent'],
      });
      await updateProgress(40);

      if (!draw) {
        this.logger.warn(`Draw with code ${drawCode} not found for competition ${tournamentCode}, skipping standing sync`);
        return;
      }

      this.logger.debug(`Found draw: ${draw.id} with code ${drawCode}, subeventId: ${draw.subeventId}`);

      // Standings are calculated locally from game results
      // This is typically done by aggregating game results rather than syncing from external API
      await updateProgress(80);
      draw.lastSync = new Date();
      await draw.save();
      this.logger.debug(`Standings for draw ${drawCode} are calculated locally from game results`);
      await updateProgress(90);

      this.logger.log(`Completed competition standing sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition standing sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }
}
