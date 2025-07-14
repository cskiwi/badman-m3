import { PermGuard, User } from '@app/backend-authorization';
import { Player } from '@app/models';
import { Controller, Get, Logger, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { DEFAULT_CLIENTS, getClients, getTypes, IndexingClient, IndexType } from '../utils';
import { IndexService } from '../services';
import { Cron } from '@nestjs/schedule';

export class IndexQuery {
  @IsArray()
  @IsEnum(IndexingClient, { each: true })
  @IsOptional()
  @ApiProperty({
    enum: IndexingClient,
    isArray: true,
    description: 'Select one or both clients',
  })
  clients?: IndexingClient[];

  @IsArray()
  @IsEnum(IndexType, { each: true })
  @IsOptional()
  @ApiProperty({
    enum: IndexType,
    isArray: true,
    description: 'Select one or more types to index',
  })
  types?: IndexType[];
}

@Controller('index')
@ApiBearerAuth('Auth0')
@UseGuards(PermGuard)
export class IndexController {
  private readonly logger = new Logger(IndexController.name);

  constructor(private readonly indexService: IndexService) {}

  @Cron('28 13 * * *')
  async cronIndex() {
    this.logger.log(`Indexing`);

    const toIndex = [
      this.indexService.indexPlayers(DEFAULT_CLIENTS),
      this.indexService.indexClubs(DEFAULT_CLIENTS),
      this.indexService.indexCompetitionEvents(DEFAULT_CLIENTS),
      this.indexService.indexTournamentEvents(DEFAULT_CLIENTS),
    ];

    await Promise.all(toIndex);
  }

  @Get('/')
  async indexAll(@User() user: Player, @Query() query: IndexQuery) {
    this.logger.log(`Indexing all data for user ${user?.fullName}`);

    const clients = Array.isArray(query.clients)
      ? query.clients
      : query.clients
        ? [query.clients]
        : DEFAULT_CLIENTS;

    const types = Array.isArray(query.types)
      ? query.types
      : query.types
        ? [query.types]
        : [
            IndexType.PLAYERS,
            IndexType.CLUBS,
            IndexType.COMPETITION_EVENTS,
            IndexType.TOURNAMENT_EVENTS,
          ];

    if (!clients.some((client) => DEFAULT_CLIENTS.includes(client))) {
      throw new Error('Invalid client');
    }

    const toIndex = types.map((type) => {
      switch (type) {
        case IndexType.PLAYERS:
          return this.indexService.indexPlayers(clients);
        case IndexType.CLUBS:
          return this.indexService.indexClubs(clients);
        case IndexType.COMPETITION_EVENTS:
          return this.indexService.indexCompetitionEvents(clients);
        case IndexType.TOURNAMENT_EVENTS:
          return this.indexService.indexTournamentEvents(clients);
      }
    });

    await Promise.all(toIndex);

    return { message: 'Indexing completed' };
  }
}
