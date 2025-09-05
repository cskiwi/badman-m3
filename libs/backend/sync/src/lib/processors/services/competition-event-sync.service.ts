import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { CompetitionStructureSyncService } from './competition-structure-sync.service';
import { generateJobId } from '../../utils/job.utils';
import { CompetitionPlanningService, CompetitionWorkPlan } from './competition-planning.service';

export interface CompetitionEventSyncData {
  tournamentCode: string;
  eventCodes?: string[];
  includeSubComponents?: boolean;
  workPlan?: CompetitionWorkPlan;
}

@Injectable()
export class CompetitionEventSyncService {
  private readonly logger = new Logger(CompetitionEventSyncService.name);

  constructor(
    private readonly competitionStructureSyncService: CompetitionStructureSyncService,
    private readonly competitionPlanningService: CompetitionPlanningService,
    @InjectFlowProducer('competition-sync') private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processEventSync(
    data: CompetitionEventSyncData,
    jobId: string,
    queueQualifiedName: string,
    updateProgress?: (progress: number) => Promise<void>,
    job?: Job,
    token?: string,
  ): Promise<void> {
    this.logger.log(`Processing competition event sync`);
    const { tournamentCode, eventCodes, includeSubComponents, workPlan } = data;

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // planning + structure sync + (optional child job creation)

      // Calculate work plan if not provided
      let currentWorkPlan = workPlan;
      if (!currentWorkPlan) {
        currentWorkPlan = await this.competitionPlanningService.calculateCompetitionWorkPlan(
          tournamentCode, 
          eventCodes, 
          includeSubComponents
        );
        this.logger.log(`Work plan: ${currentWorkPlan.totalJobs} total jobs needed`);
      }
      
      completedSteps++;
      await updateProgress?.(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));

      // Sync events first using the structure sync service
      await this.competitionStructureSyncService.processStructureSync(
        { tournamentCode, eventCodes },
        async (progress: number) => {
          // Forward structure sync progress proportionally
          const structureProgress = completedSteps + (progress / 100);
          const overallProgress = this.competitionPlanningService.calculateProgress(structureProgress, totalSteps, includeSubComponents);
          await updateProgress?.(overallProgress);
          this.logger.debug(`Structure sync progress: ${progress}%`);
        },
      );
      
      completedSteps++;
      await updateProgress?.(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));

      // If includeSubComponents, add sub-component sync jobs with work plan context
      if (includeSubComponents) {
        const subEventJobName = generateJobId('competition', 'subevent', tournamentCode);

        await this.competitionSyncFlow.add({
          name: generateJobId('competition', 'subevent', tournamentCode),
          queueName: COMPETITION_EVENT_QUEUE,
          data: { 
            tournamentCode, 
            eventCodes, 
            includeSubComponents: true,
            workPlan: currentWorkPlan,
            metadata: {
              displayName: `Sub-Event Sync: ${tournamentCode}`,
              description: `Sub-event synchronization for competition ${tournamentCode}`,
              totalJobs: currentWorkPlan.totalJobs,
              breakdown: currentWorkPlan.breakdown
            }
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
        const finalProgress = this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
        await updateProgress?.(finalProgress);
        
        // Check if we should wait for children using BullMQ pattern
        if (job && token) {
          const shouldWait = await job.moveToWaitingChildren(token);
          if (shouldWait) {
            this.logger.log(`Competition event sync waiting for child jobs. Total work plan: ${currentWorkPlan.totalJobs} jobs`);
            throw new WaitingChildrenError();
          }
        }
        
        this.logger.log(`Completed competition event sync, child jobs queued. Total work plan: ${currentWorkPlan.totalJobs} jobs`);
        return;
      }

      this.logger.log(`Completed competition event sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition event sync: ${errorMessage}`);
      throw error;
    }
  }

}
