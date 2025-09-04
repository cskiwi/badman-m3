import { TournamentApiClient } from '@app/backend-tournament-api';
import { Injectable, Logger } from '@nestjs/common';

export interface CompetitionWorkPlan {
  competitionId: string;
  totalJobs: number;
  breakdown: {
    events: number;
    subEvents: number;
    draws: number;
    encounters: number;
    games: number;
    standings: number;
    entries: number;
  };
  eventPlans: CompetitionEventWorkPlan[];
}

export interface CompetitionEventWorkPlan {
  eventId: string;
  eventName: string;
  subEventCount: number;
  drawCount: number;
  estimatedEncountersPerDraw: number;
  estimatedGamesPerDraw: number;
  totalEncounters: number;
  totalGames: number;
}

@Injectable()
export class CompetitionPlanningService {
  private readonly logger = new Logger(CompetitionPlanningService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
  ) {}

  /**
   * Calculate the total work plan for a competition synchronization
   */
  async calculateCompetitionWorkPlan(
    competitionId: string, 
    eventIds?: string[],
    includeSubComponents = true
  ): Promise<CompetitionWorkPlan> {
    this.logger.log(`Calculating work plan for competition ${competitionId}`);

    try {
      // Get competition events
      const events = eventIds && eventIds.length > 0
        ? await Promise.all(eventIds.map(id => 
            this.tournamentApiClient.getTournamentEvents(competitionId, id)))
        : [await this.tournamentApiClient.getTournamentEvents(competitionId)];

      const flatEvents = events.flat();
      
      let totalDraws = 0;
      const eventPlans: CompetitionEventWorkPlan[] = [];

      // Calculate work for each event
      for (const event of flatEvents) {
        try {
          const draws = await this.tournamentApiClient.getEventDraws(competitionId, event.Code);
          let eventGames = 0;

          if (includeSubComponents) {
            // Estimate games per draw based on draw size and type
            for (const draw of draws) {
              const estimatedGames = this.estimateGamesInDraw(draw.Size, draw.TypeID);
              eventGames += estimatedGames;
            }
          }

          totalDraws += draws.length;

          eventPlans.push({
            eventId: event.Code,
            eventName: event.Name,
            subEventCount: 0, // Not applicable for tournament events
            drawCount: draws.length,
            estimatedEncountersPerDraw: draws.length > 0 ? Math.round(eventGames / draws.length) : 0,
            estimatedGamesPerDraw: draws.length > 0 ? Math.round(eventGames / draws.length) : 0,
            totalEncounters: eventGames, // For tournaments, encounters are essentially games
            totalGames: eventGames,
          });

        } catch (error) {
          this.logger.warn(`Could not get draws for event ${event.Code}: ${error}`);
          eventPlans.push({
            eventId: event.Code,
            eventName: event.Name,
            subEventCount: 0,
            drawCount: 0,
            estimatedEncountersPerDraw: 0,
            estimatedGamesPerDraw: 0,
            totalEncounters: 0,
            totalGames: 0,
          });
        }
      }

      // Calculate total job count based on tournament sync workflow
      const breakdown = {
        events: 1, // Main event sync job
        subEvents: includeSubComponents ? 1 : 0, // Sub-event sync job
        draws: includeSubComponents ? totalDraws : 0,
        encounters: includeSubComponents ? totalDraws : 0, // One encounter sync job per draw
        games: includeSubComponents ? totalDraws : 0, // One game sync job per draw
        standings: includeSubComponents ? totalDraws : 0, // One standing sync job per draw
        entries: 0, // Not used in tournament planning
      };

      const totalJobs = Object.values(breakdown).reduce((sum, count) => sum + count, 0);

      const workPlan: CompetitionWorkPlan = {
        competitionId,
        totalJobs,
        breakdown,
        eventPlans,
      };

      this.logger.log(`Work plan calculated: ${totalJobs} total jobs for competition ${competitionId}`);
      this.logger.debug(`Breakdown: ${JSON.stringify(breakdown, null, 2)}`);

      return workPlan;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to calculate work plan: ${errorMessage}`);
      
      // Return minimal work plan as fallback
      return {
        competitionId,
        totalJobs: 1,
        breakdown: {
          events: 1,
          subEvents: 0,
          draws: 0,
          encounters: 0,
          games: 0,
          standings: 0,
          entries: 0,
        },
        eventPlans: [],
      };
    }
  }

  /**
   * Estimate number of games in a draw based on size and type
   */
  private estimateGamesInDraw(drawSize: number, drawTypeId: number): number {
    if (!drawSize || drawSize <= 0) return 0;

    switch (drawTypeId) {
      case 0: // Knockout elimination
      case 4: // Playoff/championship
        return Math.max(1, drawSize - 1); // n-1 games for elimination
      
      case 1: // Qualification rounds
      case 2: // Pre-qualification  
      case 5: // Qualifying tournament
        return Math.max(1, Math.ceil(drawSize / 2)); // Estimate half the players play
      
      case 3: // Round-robin groups
        return drawSize > 1 ? (drawSize * (drawSize - 1)) / 2 : 0; // All play all: n*(n-1)/2
      
      default:
        return Math.max(1, Math.ceil(drawSize / 2)); // Conservative estimate
    }
  }

  /**
   * Calculate progress percentage based on completed jobs
   */
  calculateProgress(completedJobs: number, totalJobs: number): number {
    if (totalJobs <= 0) return 100;
    return Math.min(100, Math.round((completedJobs / totalJobs) * 100));
  }
}