import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { Response } from 'express';
import { IndexingClient, IndexType } from '../client';
import { SearchService } from '../services';

export class SearchQuery {
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
    description: 'Select one or more types to search',
  })
  types?: IndexType[];

  @ApiProperty({ type: String, description: 'The search query' })
  query!: string;
}

@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get('/')
  async search(@Query() query: SearchQuery, @Res() res: Response) {
    const clients = query.clients || [
      IndexingClient.TYPESENSE_CLIENT,
      IndexingClient.ALGOLIA_CLIENT,
    ];

    const types = query.types || [
      IndexType.PLAYERS,
      IndexType.CLUBS,
      IndexType.COMPETITION_EVENTS,
      IndexType.TOURNAMENT_EVENTS,
    ];

    const result = await this.searchService.search(query.query, clients, types);

    return res.json(result);
  }
}
