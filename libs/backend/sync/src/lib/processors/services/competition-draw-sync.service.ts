import { TournamentApiClient } from '@app/backend-tournament-api';
import { CompetitionDraw } from '@app/models';
import { DrawType } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';

export interface CompetitionDrawSyncData {
  tournamentCode: string;
  drawCode: string;
  includeSubComponents?: boolean;
}

@Injectable()
export class CompetitionDrawSyncService {
  private readonly logger = new Logger(CompetitionDrawSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    @InjectFlowProducer('competition-sync') private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processDrawSync(
    data: CompetitionDrawSyncData,
    jobId: string,
    queueQualifiedName: string,
  ): Promise<void> {
    this.logger.log(`Processing competition draw sync`);
    const { tournamentCode, drawCode, includeSubComponents } = data;

    try {
      // Update/create the draw record and sync entries
      await this.updateCompetitionDrawFromApi(tournamentCode, drawCode);

      // Get draw name for metadata
      const drawName = await this.getDrawName(tournamentCode, drawCode);

      // Sync entries for this draw
      await this.competitionSyncFlow.add({
        name: 'competition-entry-sync',
        queueName: COMPETITION_EVENT_QUEUE,
        data: { 
          tournamentCode, 
          drawCode,
          metadata: {
            displayName: `Entries: ${drawName}`,
            drawName: drawName,
            description: `Entry synchronization for draw ${drawName}`
          }
        },
        opts: {
          parent: {
            id: jobId,
            queue: queueQualifiedName,
          },
        },
      });

      // If includeSubComponents, sync encounters and then standings
      if (includeSubComponents) {
        await this.competitionSyncFlow.add({
          name: 'competition-encounter-sync',
          queueName: COMPETITION_EVENT_QUEUE,
          data: { 
            tournamentCode, 
            drawCode,
            metadata: {
              displayName: `Encounters: ${drawName}`,
              drawName: drawName,
              description: `Encounter synchronization for draw ${drawName}`
            }
          },
          children: [
            {
              name: 'competition-standing-sync',
              queueName: COMPETITION_EVENT_QUEUE,
              data: { 
                tournamentCode, 
                drawCode,
                metadata: {
                  displayName: `Standing: ${drawName}`,
                  drawName: drawName,
                  description: `Standing synchronization for draw ${drawName}`
                }
              },
            },
          ],
          opts: {
            parent: {
              id: jobId,
              queue: queueQualifiedName,
            },
          },
        });
      }

      this.logger.log(`Completed competition draw sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition draw sync: ${errorMessage}`);
      throw error;
    }
  }

  private async updateCompetitionDrawFromApi(tournamentCode: string, drawCode: string): Promise<void> {
    try {
      const drawData = await this.tournamentApiClient.getDrawDetails?.(tournamentCode, drawCode);
      if (drawData) {
        const existingDraw = await CompetitionDraw.findOne({
          where: { visualCode: drawCode },
        });

        if (existingDraw) {
          existingDraw.name = drawData.Name;
          existingDraw.type = this.mapDrawType(drawData.TypeID) as DrawType;
          existingDraw.size = drawData.Size;
          existingDraw.lastSync = new Date();
          await existingDraw.save();
        } else {
          // Create new competition draw
          const newDraw = new CompetitionDraw();
          newDraw.name = drawData.Name;
          newDraw.type = this.mapDrawType(drawData.TypeID) as DrawType;
          newDraw.size = drawData.Size;
          newDraw.visualCode = drawCode;
          newDraw.lastSync = new Date();
          await newDraw.save();
        }
      }
    } catch {
      this.logger.debug(`Could not update competition draw ${drawCode} from API`);
    }
  }

  /**
   * Get draw name for display purposes
   */
  private async getDrawName(tournamentCode: string, drawCode: string): Promise<string> {
    try {
      const drawData = await this.tournamentApiClient.getDrawDetails?.(tournamentCode, drawCode);
      return drawData?.Name || drawCode;
    } catch (error) {
      // Fallback to draw code if API call fails
      return drawCode;
    }
  }

  private mapDrawType(drawTypeId: number): string {
    switch (drawTypeId) {
      case 0:
        return 'KO'; // Knockout elimination
      case 1:
        return 'QUALIFICATION'; // Qualification rounds
      case 2:
        return 'QUALIFICATION'; // Pre-qualification
      case 3:
        return 'POULE'; // Round-robin groups
      case 4:
        return 'KO'; // Playoff/championship
      case 5:
        return 'QUALIFICATION'; // Qualifying tournament
      default:
        return 'POULE'; // Default to round-robin for competitions
    }
  }
}
