import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { Response } from 'express';
import { SearchService } from '../services';
import { IndexType } from '../utils';

export class SearchQuery {
  @IsArray()
  @IsEnum(IndexType, { each: true })
  @IsOptional()
  @ApiProperty({ enum: IndexType, isArray: true, description: 'Select one or more types to search', required: false })
  types?: IndexType[];

  @ApiProperty({ type: String, description: 'The search query' })
  query!: string;
}

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('/')
  async search(@Query() query: SearchQuery, @Res() res: Response) {
    const types = query.types || [IndexType.PLAYERS, IndexType.CLUBS, IndexType.COMPETITION_EVENTS, IndexType.TOURNAMENT_EVENTS];

    const result = await this.searchService.search(query.query, types);

    return res.json(result);
  }
}
