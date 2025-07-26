import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { TournamentApiClient, Tournament, TournamentType } from '@app/tournament-api';
import {
  TOURNAMENT_SYNC_QUEUE,
  TournamentSyncJobType,
  TournamentDiscoveryJobData,
} from '../queues/tournament-sync.queue';

@Injectable()
@Processor(TOURNAMENT_SYNC_QUEUE)
export class TournamentDiscoveryProcessor {
  private readonly logger = new Logger(TournamentDiscoveryProcessor.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
  ) {}

  @Process(TournamentSyncJobType.TOURNAMENT_DISCOVERY)
  async processTournamentDiscovery(job: Job<TournamentDiscoveryJobData>): Promise<void> {
    this.logger.log(`Processing tournament discovery job: ${job.id}`);
    
    try {
      const { refDate, pageSize, searchTerm } = job.data;
      
      // Discover tournaments from API
      const tournaments = await this.tournamentApiClient.discoverTournaments({
        refDate: refDate || '2024-01-01',
        pageSize: pageSize || 100,
        searchTerm,
      });

      this.logger.log(`Discovered ${tournaments.length} tournaments`);

      // Process each tournament
      for (const tournament of tournaments) {
        await this.processTournament(tournament);
      }

      this.logger.log(`Completed tournament discovery job: ${job.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process tournament discovery: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  private async processTournament(tournament: Tournament): Promise<void> {
    try {
      // Check if tournament already exists in our database
      const existingTournament = await this.findExistingTournament(tournament.Code);
      
      if (existingTournament) {
        this.logger.debug(`Tournament ${tournament.Code} already exists, skipping`);
        return;
      }

      // Create new tournament record
      await this.createTournament(tournament);
      
      this.logger.log(`Created new tournament: ${tournament.Name} (${tournament.Code})`);
      
      // Schedule initial structure sync based on tournament type
      if (tournament.TypeID === TournamentType.Team) {
        // Competition - schedule structure sync only during May-August
        const now = new Date();
        const month = now.getMonth() + 1; // JavaScript months are 0-based
        
        if (month >= 5 && month <= 8) {
          // TODO: Queue competition structure sync
          this.logger.log(`Scheduling competition structure sync for ${tournament.Code}`);
        }
      } else if (tournament.TypeID === TournamentType.Individual) {
        // Tournament - schedule structure sync immediately if not finished
        if (tournament.TournamentStatus !== 101) { // 101 = Tournament Finished
          // TODO: Queue tournament structure sync
          this.logger.log(`Scheduling tournament structure sync for ${tournament.Code}`);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament ${tournament.Code}: ${errorMessage}`);
    }
  }

  private async findExistingTournament(tournamentCode: string): Promise<any> {
    // TODO: Implement database lookup
    // This should query the database to check if a tournament with this visualCode already exists
    // For now, return null to create all tournaments
    return null;
  }

  private async createTournament(tournament: Tournament): Promise<void> {
    // TODO: Implement database creation
    // This should create a new tournament record in the database
    // Map Tournament Software fields to our database schema
    
    const tournamentData = {
      visualCode: tournament.Code,
      name: tournament.Name,
      type: tournament.TypeID === TournamentType.Team ? 'competition' : 'tournament',
      status: this.mapTournamentStatus(tournament.TournamentStatus),
      startDate: new Date(tournament.StartDate),
      endDate: new Date(tournament.EndDate),
      lastUpdated: new Date(tournament.LastUpdated),
      livescore: tournament.Livescore,
      timezone: tournament.TournamentTimezone,
      
      // Organization info
      organizationId: tournament.Organization?.ID,
      organizationName: tournament.Organization?.Name,
      
      // Contact info
      contactName: tournament.Contact?.Name,
      contactPhone: tournament.Contact?.Phone,
      contactEmail: tournament.Contact?.Email,
      
      // Venue info
      venueName: tournament.Venue?.Name,
      venueAddress: tournament.Venue?.Address,
      venuePostalCode: tournament.Venue?.PostalCode,
      venueCity: tournament.Venue?.City,
      venueState: tournament.Venue?.State,
      venueCountryCode: tournament.Venue?.CountryCode,
      venuePhone: tournament.Venue?.Phone,
      venueWebsite: tournament.Venue?.Website,
      
      // Entry dates for tournaments
      onlineEntryStartDate: tournament.OnlineEntryStartDate ? new Date(tournament.OnlineEntryStartDate) : null,
      onlineEntryEndDate: tournament.OnlineEntryEndDate ? new Date(tournament.OnlineEntryEndDate) : null,
      onlineEntryWithdrawalDeadline: tournament.OnlineEntryWithdrawalDeadline ? new Date(tournament.OnlineEntryWithdrawalDeadline) : null,
      
      // Prize money for tournaments
      prizeMoney: tournament.PrizeMoney,
    };

    this.logger.debug(`Creating tournament with data:`, tournamentData);
    
    // TODO: Insert into database using TypeORM or your ORM of choice
    // Example:
    // await this.tournamentRepository.create(tournamentData);
  }

  private mapTournamentStatus(status: number): string {
    switch (status) {
      case 0: return 'unknown';
      case 101: return 'finished';
      case 199: return 'cancelled';
      case 198: return 'postponed';
      case 201: return 'league_new';
      case 202: return 'league_entry_open';
      case 203: return 'league_publicly_visible';
      case 204: return 'league_finished';
      default: return 'unknown';
    }
  }
}