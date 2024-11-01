import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { Response } from 'express';
import { SearchService } from '../services';
import { getClients, getTypes, IndexingClient, IndexType } from '../utils';

export class SearchQuery {
  @IsArray()
  @IsEnum(IndexingClient, { each: true })
  @IsOptional()
  @ApiProperty({
    enum: IndexingClient,
    isArray: true,
    description: 'Select one or both clients',
    required: false,
  })
  clients?: IndexingClient[];

  @IsArray()
  @IsEnum(IndexType, { each: true })
  @IsOptional()
  @ApiProperty({
    enum: IndexType,
    isArray: true,
    description: 'Select one or more types to search',
    required: false,
  })
  types?: IndexType[];

  @ApiProperty({ type: String, description: 'The search query' })
  query!: string;
}

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('/')
  async search(@Query() query: SearchQuery, @Res() res: Response) {
    const clients = getClients(query.clients);
    const types = getTypes(query.types);

    const result = await this.searchService.search(query.query, clients, types);

    return res.json(result);
  }
}
