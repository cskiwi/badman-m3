import { TournamentApiClient } from '@app/backend-tournament-api';
import { CompetitionDraw, CompetitionEncounter, Team as TeamModel } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { CompetitionPlanningService, CompetitionWorkPlan } from './competition-planning.service';

export interface CompetitionEncounterSyncData {
  tournamentCode: string;
  drawCode: string;
  encounterCodes?: string[];
  includeSubComponents?: boolean;
  workPlan?: CompetitionWorkPlan;
  childJobsCreated?: boolean;
}

@Injectable()
export class CompetitionEncounterSyncService {
  private readonly logger = new Logger(CompetitionEncounterSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly competitionPlanningService: CompetitionPlanningService,
    @InjectFlowProducer(COMPETITION_EVENT_QUEUE) private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processEncounterSync(
    job: Job<CompetitionEncounterSyncData>,
    updateProgress: (progress: number) => Promise<void>,
    token: string
  ): Promise<void> {
    this.logger.log(`Processing competition encounter sync`);
    const { tournamentCode, drawCode, encounterCodes, includeSubComponents, workPlan } = job.data;

    try {
      // Check if this job has already created child jobs and handle different resume scenarios

      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // encounter sync + (optional child job creation)

      // Only do the actual work if we're not resuming after children
      if (!includeSubComponents) {
        // Create/update encounters (primary responsibility of Encounter service)
        await this.createOrUpdateEncounters(tournamentCode, drawCode, encounterCodes);

        completedSteps++;
        await updateProgress(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
        this.logger.debug(`Completed encounter creation/update`);

        // If includeSubComponents, add game-level sync jobs
        if (includeSubComponents) {
          const gameJobName = generateJobId('competition', 'game', tournamentCode, drawCode);
          const standingJobName = generateJobId('competition', 'standing', tournamentCode, drawCode);

          await this.competitionSyncFlow.add({
            name: generateJobId('competition', 'game', tournamentCode, drawCode),
            queueName: COMPETITION_EVENT_QUEUE,
            data: {
              tournamentCode,
              drawCode,
              includeSubComponents: true,
              metadata: {
                displayName: `Game Sync: ${drawCode}`,
                description: `Game synchronization for draw ${drawCode} in competition ${tournamentCode}`,
              },
            },
            opts: {
              jobId: gameJobName,
              parent: {
                id: job.id!,
                queue: job.queueQualifiedName,
              },
            },
          });

          await this.competitionSyncFlow.add({
            name: generateJobId('competition', 'standing', tournamentCode, drawCode),
            queueName: COMPETITION_EVENT_QUEUE,
            data: {
              tournamentCode,
              drawCode,
              metadata: {
                displayName: `Standing Sync: ${drawCode}`,
                description: `Standing synchronization for draw ${drawCode} in competition ${tournamentCode}`,
              },
            },
            opts: {
              jobId: standingJobName,
              parent: {
                id: job.id!,
                queue: job.queueQualifiedName,
              },
            },
          });

          // Complete this job's work (encounter sync + child job creation)
          completedSteps++;
          const finalProgress = this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
          await updateProgress(finalProgress);
        }
      }

      this.logger.log(`Completed competition encounter sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition encounter sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  private async createOrUpdateEncounters(tournamentCode: string, drawCode: string, encounterCodes?: string[]): Promise<void> {
    this.logger.log(`Creating/updating encounters for competition ${tournamentCode}, draw ${drawCode}`);

    try {
      let encounters: unknown[] = [];

      if (encounterCodes && encounterCodes.length > 0) {
        // Sync specific encounters
        for (const encounterCode of encounterCodes) {
          try {
            const encounter = await this.tournamentApiClient.getEncounterDetails?.(tournamentCode, encounterCode);
            if (encounter) {
              encounters.push(encounter);
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`Failed to get encounter ${encounterCode}: ${errorMessage}`, error);
          }
        }
      } else {
        // Sync all encounters in a draw
        const drawEncounters = await this.tournamentApiClient.getEncountersByDraw?.(tournamentCode, drawCode);
        encounters = drawEncounters?.filter((encounter: unknown) => encounter != null) || [];
      }

      // Process encounters
      for (const encounter of encounters) {
        if (!encounter) {
          this.logger.warn(`Skipping undefined encounter`);
          continue;
        }

        await this.createOrUpdateEncounter(tournamentCode, encounter);
      }

      this.logger.log(`Created/updated ${encounters.length} encounters`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create/update encounters: ${errorMessage}`, error);
      throw error;
    }
  }

  private async createOrUpdateEncounter(tournamentCode: string, encounter: unknown): Promise<void> {
    const encounterData = encounter as {
      Code: string;
      DrawCode: string;
      Date?: string;
      OriginalDate?: string;
      HomeTeam?: unknown;
      AwayTeam?: unknown;
      HomeScore?: number;
      AwayScore?: number;
      StartHour?: string;
      EndHour?: string;
      Shuttle?: number;
    };

    this.logger.debug(`Processing encounter: ${encounterData.Code}`);

    // Find the draw this encounter belongs to with competition context
    const draw = await CompetitionDraw.findOne({
      where: {
        visualCode: encounterData.DrawCode,
        competitionSubEvent: {
          competitionEvent: {
            visualCode: tournamentCode,
          },
        },
      },
      relations: ['competitionSubEvent', 'competitionSubEvent.competitionEvent'],
    });

    if (!draw) {
      this.logger.warn(`Competition draw with code ${encounterData.DrawCode} not found, skipping encounter ${encounterData.Code}`);
      return;
    }

    // Find or create teams
    let homeTeam: TeamModel | null = null;
    let awayTeam: TeamModel | null = null;

    if (encounterData.HomeTeam) {
      homeTeam = await this.findOrCreateTeamFromEntry(encounterData.HomeTeam);
    }
    if (encounterData.AwayTeam) {
      awayTeam = await this.findOrCreateTeamFromEntry(encounterData.AwayTeam);
    }

    const existingEncounter = await CompetitionEncounter.findOne({
      where: {
        visualCode: encounterData.Code,
        drawCompetition: {
          competitionSubEvent: {
            competitionEvent: {
              visualCode: tournamentCode,
            },
          },
        },
      },
      relations: ['drawCompetition', 'drawCompetition.competitionSubEvent', 'drawCompetition.competitionSubEvent.competitionEvent'],
    });

    if (existingEncounter) {
      existingEncounter.date = encounterData.Date ? new Date(encounterData.Date) : undefined;
      existingEncounter.originalDate = encounterData.OriginalDate ? new Date(encounterData.OriginalDate) : undefined;
      existingEncounter.drawId = draw.id;
      existingEncounter.homeTeamId = homeTeam?.id;
      existingEncounter.awayTeamId = awayTeam?.id;
      existingEncounter.homeScore = encounterData.HomeScore;
      existingEncounter.awayScore = encounterData.AwayScore;
      existingEncounter.startHour = encounterData.StartHour;
      existingEncounter.endHour = encounterData.EndHour;
      existingEncounter.shuttle = `${encounterData.Shuttle}`;
      await existingEncounter.save();
    } else {
      const newEncounter = new CompetitionEncounter();
      newEncounter.visualCode = encounterData.Code;
      newEncounter.date = encounterData.Date ? new Date(encounterData.Date) : undefined;
      newEncounter.originalDate = encounterData.OriginalDate ? new Date(encounterData.OriginalDate) : undefined;
      newEncounter.drawId = draw.id;
      newEncounter.homeTeamId = homeTeam?.id;
      newEncounter.awayTeamId = awayTeam?.id;
      newEncounter.homeScore = encounterData.HomeScore;
      newEncounter.awayScore = encounterData.AwayScore;
      newEncounter.startHour = encounterData.StartHour;
      newEncounter.endHour = encounterData.EndHour;
      newEncounter.shuttle = `${encounterData.Shuttle}`;
      await newEncounter.save();
    }
  }

  private async processGame(tournamentCode: string, game: unknown): Promise<void> {
    // This would delegate to the game sync service
    // For now, just log it
    this.logger.debug(`Processing game from encounter: ${JSON.stringify(game)}`);
  }

  private async findOrCreateTeamFromEntry(teamData: unknown): Promise<TeamModel | null> {
    const team = teamData as { Code?: string; Name?: string };

    if (!team || !team.Code) {
      return null;
    }

    const existingTeam = await TeamModel.findOne({
      where: { name: team.Name },
    });

    if (existingTeam) {
      return existingTeam;
    }

    // Create minimal team record for API reference
    const newTeam = new TeamModel();
    newTeam.name = team.Name || `Team ${team.Code}`;
    // Note: Team model doesn't have visualCode, using name as identifier
    await newTeam.save();

    return newTeam;
  }
}
