import { TournamentApiClient } from '@app/backend-tournament-api';
import { Injectable, Logger } from '@nestjs/common';

export interface TournamentWorkPlan {
  tournamentCode: string;
  totalJobs: number;
  breakdown: {
    events: number;
    subEvents: number;
    draws: number;
    games: number;
    standings: number;
  };
  eventPlans: EventWorkPlan[];
}

export interface EventWorkPlan {
  eventCode: string;
  eventName: string;
  drawCount: number;
  estimatedGamesPerDraw: number;
  totalGames: number;
}

@Injectable()
export class TournamentPlanningService {
  private readonly logger = new Logger(TournamentPlanningService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
  ) {}

  /**
   * Calculate the total work plan for a tournament synchronization
   */
  async calculateTournamentWorkPlan(
    tournamentCode: string, 
    eventCodes?: string[],
    includeSubComponents = true
  ): Promise<TournamentWorkPlan> {
    this.logger.log(`Calculating work plan for tournament ${tournamentCode}`);

    try {
      // Get tournament events
      const events = eventCodes && eventCodes.length > 0
        ? await Promise.all(eventCodes.map(code => 
            this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
        : [await this.tournamentApiClient.getTournamentEvents(tournamentCode)];

      const flatEvents = events.flat();
      
      let totalDraws = 0;
      let totalGames = 0;
      const eventPlans: EventWorkPlan[] = [];

      // Calculate work for each event
      for (const event of flatEvents) {
        try {
          const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, event.Code);
          let eventGames = 0;

          if (includeSubComponents) {
            // Estimate games per draw based on draw size and type
            for (const draw of draws) {
              const estimatedGames = this.estimateGamesInDraw(draw.Size, draw.TypeID);
              eventGames += estimatedGames;
            }
          }

          totalDraws += draws.length;
          totalGames += eventGames;

          eventPlans.push({
            eventCode: event.Code,
            eventName: event.Name,
            drawCount: draws.length,
            estimatedGamesPerDraw: draws.length > 0 ? Math.round(eventGames / draws.length) : 0,
            totalGames: eventGames,
          });

        } catch (error) {
          this.logger.warn(`Could not get draws for event ${event.Code}: ${error}`);
          eventPlans.push({
            eventCode: event.Code,
            eventName: event.Name,
            drawCount: 0,
            estimatedGamesPerDraw: 0,
            totalGames: 0,
          });
        }
      }

      // Calculate total job count
      const breakdown = {
        events: 1, // Main event sync job
        subEvents: includeSubComponents ? 1 : 0, // Sub-event sync job
        draws: includeSubComponents ? totalDraws : 0,
        games: includeSubComponents ? totalDraws : 0, // One game sync job per draw
        standings: includeSubComponents ? totalDraws : 0, // One standing sync job per draw
      };

      const totalJobs = Object.values(breakdown).reduce((sum, count) => sum + count, 0);

      const workPlan: TournamentWorkPlan = {
        tournamentCode,
        totalJobs,
        breakdown,
        eventPlans,
      };

      this.logger.log(`Work plan calculated: ${totalJobs} total jobs for tournament ${tournamentCode}`);
      this.logger.debug(`Breakdown: ${JSON.stringify(breakdown, null, 2)}`);

      return workPlan;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to calculate work plan: ${errorMessage}`);
      
      // Return minimal work plan as fallback
      return {
        tournamentCode,
        totalJobs: 1,
        breakdown: {
          events: 1,
          subEvents: 0,
          draws: 0,
          games: 0,
          standings: 0,
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