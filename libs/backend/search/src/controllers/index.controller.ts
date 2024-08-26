import { PermGuard, User } from '@app/backend-authorization';
import { Player } from '@app/models';
import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { IndexService } from '../services';

@Controller('index')
@ApiBearerAuth('Auth0')
@UseGuards(PermGuard)
export class IndexController {
  private readonly logger = new Logger(IndexController.name);

  constructor(private indexService: IndexService) {}

  @Get('/all')
  async indexAll(@User() user: Player) {
    this.logger.log(`Indexing all data for user ${user.fullName}`);

    return Promise.all([
      this.indexService.indexPlayers(),
      this.indexService.indexClubs(),
      this.indexService.indexCompetitionEvents(),
      this.indexService.indexTournamentEvents(),
    ]);
  }

  @Get('/players')
  async indexPlayers() {
    this.logger.log(`Indexing players`);
    return this.indexService.indexPlayers();
  }

  @Get('/clubs')
  async indexClubs() {
    this.logger.log(`Indexing clubs`);
    return this.indexService.indexClubs();
  }

  @Get('/competitionEvents')
  async indexCompetitionEvents() {
    this.logger.log(`Indexing competition events`);
    return this.indexService.indexCompetitionEvents();
  }

  @Get('/tournamentEvents')
  async indexTournamentEvents() {
    this.logger.log(`Indexing tournament events`);
    return this.indexService.indexTournamentEvents();
  }
}
