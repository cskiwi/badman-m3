import { Tournament, TournamentApiClient, TournamentType } from '@app/backend-tournament-api';
import { CompetitionEvent, TournamentEvent } from '@app/models';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { TOURNAMENT_DISCOVERY_QUEUE as DISCOVERY_QUEUE, TournamentDiscoveryJobData } from '../queues/sync.queue';

@Injectable()
@Processor(DISCOVERY_QUEUE)
export class DiscoveryProcessor extends WorkerHost {
  private readonly logger = new Logger(DiscoveryProcessor.name);

  constructor(private readonly tournamentApiClient: TournamentApiClient) {
    super();
  }

  async process(job: Job<TournamentDiscoveryJobData, void, string>): Promise<void> {
    this.logger.log(`Processing discovery job: ${job.id}`);

    try {
      const { refDate, pageSize, searchTerm } = job.data;

      // Initialize progress
      await job.updateProgress(0);

      // Discover tournaments from API
      const tournaments = await this.tournamentApiClient.discoverTournaments({
        refDate: refDate || '2024-01-01',
        pageSize: pageSize || 100,
        searchTerm,
      });

      this.logger.log(`Discovered ${tournaments.length} events from API`);

      // Calculate total work units
      const totalTournaments = tournaments.length;
      if (totalTournaments === 0) {
        await job.updateProgress(100);
        this.logger.log(`No tournaments to process for job: ${job.id}`);
        return;
      }

      // Process each tournament with progress tracking
      for (let i = 0; i < tournaments.length; i++) {
        const tournament = tournaments[i];
        await this.processTournament(tournament);

        // Update progress: calculate percentage completed
        const progressPercentage = Math.round(((i + 1) / totalTournaments) * 100);
        await job.updateProgress(progressPercentage);

        this.logger.debug(`Processed tournament ${i + 1}/${totalTournaments} (${progressPercentage}%): ${tournament.Name}`);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament ${tournament.Code}: ${errorMessage}`, error);
    }
  }

  private async findExistingTournament(tournamentCode: string): Promise<TournamentEvent | CompetitionEvent | null> {
    // Check both tournament and competition tables for existing record
    const existingTournament = await TournamentEvent.findOne({
      where: { visualCode: tournamentCode },
    });

    if (existingTournament) {
      return existingTournament;
    }

    const existingCompetition = await CompetitionEvent.findOne({
      where: { visualCode: tournamentCode },
    });

    return existingCompetition;
  }

  private async createTournament(tournament: Tournament): Promise<void> {
    if (tournament.TypeID === TournamentType.Team) {
      // Create competition event
      const competition = new CompetitionEvent();
      competition.visualCode = tournament.Code;
      competition.name = tournament.Name;
      competition.season = new Date(tournament.StartDate).getFullYear();
      competition.lastSync = new Date();
      competition.openDate = tournament.OnlineEntryStartDate ? new Date(tournament.OnlineEntryStartDate) : new Date(tournament.StartDate);
      competition.closeDate = tournament.OnlineEntryEndDate ? new Date(tournament.OnlineEntryEndDate) : new Date(tournament.EndDate);
      competition.official = true;
      competition.state = this.mapTournamentStatus(tournament.TournamentStatus);
      competition.country = tournament.CountryCode || 'BEL';
      competition.slug = this.createSlug(tournament.Name);

      this.logger.debug(`Creating competition: ${competition.name}`);
      await competition.save();
    } else {
      // Create tournament event
      const tournamentEvent = new TournamentEvent();
      tournamentEvent.visualCode = tournament.Code;
      tournamentEvent.name = tournament.Name;
      tournamentEvent.tournamentNumber = tournament.HistoricCode || tournament.Code;
      tournamentEvent.firstDay = new Date(tournament.StartDate);
      tournamentEvent.lastSync = new Date();
      tournamentEvent.openDate = tournament.OnlineEntryStartDate ? new Date(tournament.OnlineEntryStartDate) : new Date(tournament.StartDate);
      tournamentEvent.closeDate = tournament.OnlineEntryEndDate ? new Date(tournament.OnlineEntryEndDate) : new Date(tournament.EndDate);
      tournamentEvent.dates = `${tournament.StartDate} - ${tournament.EndDate}`;
      tournamentEvent.official = true;
      tournamentEvent.state = this.mapTournamentStatus(tournament.TournamentStatus);
      tournamentEvent.country = tournament.CountryCode || 'BEL';
      tournamentEvent.slug = this.createSlug(tournament.Name);

      this.logger.debug(`Creating tournament: ${tournamentEvent.name}`);
      await tournamentEvent.save();
    }
  }

  private mapTournamentStatus(status: number): string {
    switch (status) {
      case 0:
        return 'unknown';
      case 101:
        return 'finished';
      case 199:
        return 'cancelled';
      case 198:
        return 'postponed';
      case 201:
        return 'league_new';
      case 202:
        return 'league_entry_open';
      case 203:
        return 'league_publicly_visible';
      case 204:
        return 'league_finished';
      default:
        return 'unknown';
    }
  }

  private createSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}
