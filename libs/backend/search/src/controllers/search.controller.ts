import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { SearchService } from '../services';

@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get('/')
  async search(@Query('query') query: string, @Res() res: Response) {
    const result = await this.searchService.search({
      requests: [
        {
          indexName: 'searchable',
          query,
        },
      ],
    });

    return res.json(result);
  }
}
