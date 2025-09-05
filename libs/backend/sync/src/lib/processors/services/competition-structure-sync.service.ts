import { TournamentApiClient, TournamentEvent, Team, TournamentDraw } from '@app/backend-tournament-api';
import { CompetitionSubEvent, Team as TeamModel } from '@app/models';
import { SubEventTypeEnum } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { Job, WaitingChildrenError } from 'bullmq';
import { IsNull } from 'typeorm';
import { StructureSyncJobData } from '../../queues/sync.queue';
import { SyncService } from '../../services/sync.service';
import { TournamentPlanningService } from './tournament-planning.service';

@Injectable()
export class CompetitionStructureSyncService {
  private readonly logger = new Logger(CompetitionStructureSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly syncService: SyncService,
    private readonly tournamentPlanningService: TournamentPlanningService,
  ) {}

  async processStructureSync(
    data: StructureSyncJobData,
    updateProgress: (progress: number) => Promise<void>,
    job?: Job,
    token?: string,
  ): Promise<void> {
    this.logger.log(`Processing competition structure sync`);

    try {
      const { tournamentCode, eventCodes } = data;

      // Initialize progress
      await updateProgress(0);

      // Get tournament details first
      const tournament = await this.tournamentApiClient.getTournamentDetails(tournamentCode);
      this.logger.log(`Syncing competition structure for: ${tournament.Name}`);

      // Calculate work plan for more accurate progress tracking
      const workPlan = await this.tournamentPlanningService.calculateTournamentWorkPlan(tournamentCode, eventCodes, data.includeSubComponents);

      this.logger.log(`Work plan: ${workPlan.totalJobs} total operations`);
      let completedOperations = 0;

      // Sync events
      await this.syncEvents(tournamentCode, eventCodes);
      completedOperations += workPlan.breakdown.events;
      const eventsProgress = this.tournamentPlanningService.calculateProgress(completedOperations, workPlan.totalJobs, true);
      await updateProgress(eventsProgress);
      this.logger.debug(`Completed events sync (${completedOperations}/${workPlan.totalJobs})`);

      // Sync teams - estimate 1 operation for teams sync
      await this.syncTeams(tournamentCode);
      completedOperations += 1;
      const teamsProgress = this.tournamentPlanningService.calculateProgress(completedOperations, workPlan.totalJobs, true);
      await updateProgress(teamsProgress);
      this.logger.debug(`Completed teams sync (${completedOperations}/${workPlan.totalJobs})`);

      // Sync draws/poules
      await this.syncDraws(tournamentCode, eventCodes);
      completedOperations = workPlan.totalJobs;
      const finalProgress = this.tournamentPlanningService.calculateProgress(completedOperations, workPlan.totalJobs, true);
      await updateProgress(finalProgress);
      this.logger.debug(`Completed draws sync (${completedOperations}/${workPlan.totalJobs})`);

      // Check if we should wait for children using BullMQ pattern
      if (job && token) {
        const shouldWait = await job.moveToWaitingChildren(token);
        if (shouldWait) {
          this.logger.log(`Competition structure sync waiting for child jobs`);
          throw new WaitingChildrenError();
        }
      }

      this.logger.log(`Completed competition structure sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process competition structure sync: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  private async syncEvents(tournamentCode: string, eventCodes?: string[]): Promise<void> {
    this.logger.log(`Syncing events for tournament ${tournamentCode}`);

    try {
      let events: TournamentEvent[] = [];

      if (eventCodes && eventCodes.length > 0) {
        // Sync specific events
        for (const eventCode of eventCodes) {
          const eventList = await this.tournamentApiClient.getTournamentEvents(tournamentCode, eventCode);
          events.push(...eventList);
        }
      } else {
        // Sync all events
        events = await this.tournamentApiClient.getTournamentEvents(tournamentCode);
      }

      for (const event of events) {
        await this.createOrUpdateEvent(tournamentCode, event);
      }

      this.logger.log(`Synced ${events.length} events`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync events: ${errorMessage}`);
      throw error;
    }
  }

  private async syncTeams(tournamentCode: string): Promise<void> {
    this.logger.log(`Syncing teams for tournament ${tournamentCode}`);

    try {
      const teams = await this.tournamentApiClient.getTournamentTeams(tournamentCode);

      for (const team of teams) {
        await this.createOrUpdateTeam(tournamentCode, team);
      }

      this.logger.log(`Synced ${teams.length} teams`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync teams: ${errorMessage}`);
      throw error;
    }
  }

  private async syncDraws(tournamentCode: string, eventCodes?: string[]): Promise<void> {
    this.logger.log(`Syncing draws for tournament ${tournamentCode}`);

    try {
      // Get events to sync draws for
      const events = eventCodes
        ? await Promise.all(eventCodes.map((code) => this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
        : [await this.tournamentApiClient.getTournamentEvents(tournamentCode)];

      const flatEvents = events.flat();

      for (const event of flatEvents) {
        try {
          const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, event.Code);

          for (const draw of draws) {
            await this.createOrUpdateDraw(tournamentCode, event.Code, draw);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to sync draws for event ${event.Code}: ${errorMessage}`);
        }
      }

      this.logger.log(`Synced draws for ${flatEvents.length} events`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync draws: ${errorMessage}`);
      throw error;
    }
  }

  private async createOrUpdateEvent(tournamentCode: string, event: TournamentEvent): Promise<void> {
    this.logger.debug(`Creating/updating competition sub-event: ${event.Name} (${event.Code})`);

    // Check if event already exists
    const existingEvent = await CompetitionSubEvent.findOne({
      where: { name: event.Name },
    });

    if (existingEvent) {
      existingEvent.name = event.Name;
      existingEvent.eventType = this.mapGenderType(event.GenderID);
      existingEvent.level = event.LevelID;
      existingEvent.lastSync = new Date();
      await existingEvent.save();
    } else {
      const newEvent = new CompetitionSubEvent();
      newEvent.name = event.Name;
      newEvent.eventType = this.mapGenderType(event.GenderID);
      newEvent.level = event.LevelID;
      newEvent.lastSync = new Date();
      await newEvent.save();
    }
  }

  private async createOrUpdateTeam(tournamentCode: string, team: Team): Promise<void> {
    // Extract team information for matching
    const normalizedName = this.normalizeTeamName(team.Name);
    const clubName = this.extractClubName(team.Name);
    const teamNumber = this.extractTeamNumber(team.Name);
    const gender = this.extractTeamGender(team.Name);
    const strength = this.extractTeamStrength(team.Name);

    this.logger.debug(`Processing team: ${team.Name} (${team.Code})`);

    // Try to find existing team by normalized name and club
    const existingTeam = await TeamModel.findOne({
      where: {
        name: clubName,
        teamNumber: teamNumber ?? IsNull(),
      },
      relations: ['club'],
    });

    if (!existingTeam) {
      // Queue for team matching process
      await this.syncService.queueTeamMatching({
        tournamentCode,
        unmatchedTeams: [
          {
            externalCode: team.Code,
            externalName: team.Name,
            normalizedName,
            clubName,
            teamNumber: teamNumber ?? undefined,
            gender: gender ?? undefined,
            strength: strength ?? undefined,
          },
        ],
      });

      this.logger.debug(`Queued team for matching: ${team.Name}`);
    } else {
      this.logger.debug(`Found existing team: ${existingTeam.name} for ${team.Name}`);
    }
  }

  private async createOrUpdateDraw(tournamentCode: string, eventCode: string, draw: TournamentDraw): Promise<void> {
    // For competitions, draws are typically represented as groups/divisions
    // This is more about structure than actual draws in tournaments

    this.logger.debug(`Processing competition draw/group: ${draw.Name} (${draw.Code})`);

    // Competition draws are handled differently - they're more like divisions/groups
    // For now, we'll log this but not create separate entities as the structure
    // is captured in the encounter/match relationships
  }

  private mapGenderType(genderId: number): SubEventTypeEnum {
    switch (genderId) {
      case 1:
        return SubEventTypeEnum.M;
      case 2:
        return SubEventTypeEnum.F;
      case 3:
        return SubEventTypeEnum.MX;
      default:
        return SubEventTypeEnum.M;
    }
  }

  private normalizeTeamName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private extractClubName(name: string): string {
    // Extract club name from format: "Club Name 1H (41)"
    const match = name.match(/^(.+?)\s+\d+[HDG]\s*\(\d+\)$/);
    return match ? match[1].trim() : name;
  }

  private extractTeamNumber(name: string): number | null {
    const match = name.match(/\s(\d+)[HDG]\s*\(\d+\)$/);
    return match ? parseInt(match[1], 10) : null;
  }

  private extractTeamGender(name: string): string | null {
    const match = name.match(/\s\d+([HDG])\s*\(\d+\)$/);
    if (match) {
      switch (match[1]) {
        case 'H':
          return 'men';
        case 'D':
          return 'women';
        case 'G':
          return 'mixed';
      }
    }
    return null;
  }

  private extractTeamStrength(name: string): number | null {
    const match = name.match(/\((\d+)\)$/);
    return match ? parseInt(match[1], 10) : null;
  }
}
