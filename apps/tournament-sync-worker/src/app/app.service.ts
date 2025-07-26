import { Injectable, Logger } from '@nestjs/common';
import { TournamentSyncService } from '@app/tournament-sync';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly tournamentSyncService: TournamentSyncService) {
    this.logger.log('Tournament Sync Worker service started');
  }

  async getStatus(): Promise<any> {
    const queueStats = await this.tournamentSyncService.getQueueStats();
    
    return {
      service: 'Tournament Sync Worker',
      status: 'running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      queue: queueStats,
    };
  }

  async getHealth(): Promise<any> {
    try {
      const queueStats = await this.tournamentSyncService.getQueueStats();
      
      return {
        status: 'healthy',
        checks: {
          queue: queueStats.active >= 0 ? 'up' : 'down',
          redis: 'up', // TODO: Add actual Redis health check
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
