import { Controller, Get, Post, Query } from '@nestjs/common';
import { TournamentSyncService } from '../services/tournament-sync.service';

@Controller('api/v1')
export class TournamentSyncController {
  constructor(
    private readonly tournamentSyncService: TournamentSyncService,
  ) {}

  @Get('status')
  async getStatus() {
    // Return tournament sync worker status
    return {
      status: 'running',
      timestamp: new Date().toISOString(),
      queues: await this.tournamentSyncService.getQueueStats(),
    };
  }

  @Get('jobs')
  async getJobs(@Query('limit') limit?: string, @Query('status') status?: string) {
    const jobLimit = limit ? parseInt(limit, 10) : 20;
    return this.tournamentSyncService.getRecentJobs(jobLimit, status);
  }

  @Post('sync/discovery')
  async triggerDiscovery() {
    await this.tournamentSyncService.queueTournamentDiscovery();
    return { message: 'Tournament discovery sync queued' };
  }

  @Post('sync/competitions')
  async triggerCompetitionSync() {
    await this.tournamentSyncService.queueCompetitionStructureSync();
    return { message: 'Competition structure sync queued' };
  }

  @Post('sync/tournaments')
  async triggerTournamentSync() {
    await this.tournamentSyncService.queueTournamentStructureSync();
    return { message: 'Tournament structure sync queued' };
  }
}