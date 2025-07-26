import { Controller, Get, Post } from '@nestjs/common';
import { TournamentSyncService } from '@app/tournament-sync';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly tournamentSyncService: TournamentSyncService,
  ) {}

  @Get('status')
  async getStatus() {
    return this.appService.getStatus();
  }

  @Get('health')
  async getHealth() {
    return this.appService.getHealth();
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
