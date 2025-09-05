import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { TOURNAMENT_EVENT_QUEUE } from '../../queues/sync.queue';
import { TournamentStructureSyncService } from './tournament-structure-sync.service';
import { generateJobId } from '../../utils/job.utils';
import { TournamentPlanningService, TournamentWorkPlan } from './tournament-planning.service';

export interface TournamentEventSyncData {
  tournamentCode: string;
  eventCodes?: string[];
  includeSubComponents?: boolean;
  workPlan?: TournamentWorkPlan;
}

@Injectable()
export class TournamentEventSyncService {
  private readonly logger = new Logger(TournamentEventSyncService.name);

  constructor(
    private readonly tournamentStructureSyncService: TournamentStructureSyncService,
    private readonly tournamentPlanningService: TournamentPlanningService,
    @InjectFlowProducer('tournament-sync') private readonly tournamentSyncFlow: FlowProducer,
  ) {}

  async processEventSync(
    data: TournamentEventSyncData,
    jobId: string,
    queueQualifiedName: string,
    updateProgress?: (progress: number) => Promise<void>,
    job?: Job,
    token?: string,
  ): Promise<void> {
    this.logger.log(`Processing tournament event sync`);
    const { tournamentCode, eventCodes, includeSubComponents } = data;

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // planning + structure sync + (optional child job creation)

      // First, calculate work plan to understand total scope
      const workPlan = await this.tournamentPlanningService.calculateTournamentWorkPlan(tournamentCode, eventCodes);

      completedSteps++;
      await updateProgress?.(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.log(`Work plan: ${workPlan.totalJobs} total jobs needed`);

      // Sync events first using the structure sync service
      await this.tournamentStructureSyncService.processStructureSync({ tournamentCode, eventCodes }, async (progress: number) => {
        // Forward structure sync progress proportionally
        const structureProgress = completedSteps + progress / 100;
        const overallProgress = this.tournamentPlanningService.calculateProgress(structureProgress, totalSteps, includeSubComponents);
        await updateProgress?.(overallProgress);
        this.logger.debug(`Structure sync progress: ${progress}%`);
      });

      completedSteps++;
      await updateProgress?.(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));

      // If includeSubComponents, add sub-component sync jobs with work plan context
      if (includeSubComponents) {
        const subEventJobName = generateJobId('tournament', 'subevent', tournamentCode);

        await this.tournamentSyncFlow.add({
          name: generateJobId('tournament', 'subevent', tournamentCode),
          queueName: TOURNAMENT_EVENT_QUEUE,
          data: {
            tournamentCode,
            eventCodes,
            includeSubComponents: true,
            workPlan, // Pass the work plan to child jobs
            metadata: {
              displayName: `Sub-Event Sync: ${tournamentCode}`,
              description: `Sub-event synchronization for tournament ${tournamentCode}`,
              totalJobs: workPlan.totalJobs,
              breakdown: workPlan.breakdown,
            },
          },
          opts: {
            jobId: subEventJobName,
            parent: {
              id: jobId,
              queue: queueQualifiedName,
            },
          },
        });

        // Complete this job's work (planning + structure sync + child job creation)
        completedSteps++;
        const finalProgress = this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
        await updateProgress?.(finalProgress);
        
        // Check if we should wait for children using BullMQ pattern
        if (job && token) {
          const shouldWait = await job.moveToWaitingChildren(token);
          if (shouldWait) {
            this.logger.log(`Tournament event sync waiting for child jobs. Total work plan: ${workPlan.totalJobs} jobs`);
            throw new WaitingChildrenError();
          }
        }
        
        this.logger.log(`Completed tournament event sync, child jobs queued. Total work plan: ${workPlan.totalJobs} jobs`);
        return;
      }
      this.logger.log(`Completed tournament event sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament event sync: ${errorMessage}`);
      throw error;
    }
  }
}
