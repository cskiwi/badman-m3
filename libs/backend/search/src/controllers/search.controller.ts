import { Controller, Get, Query } from '@nestjs/common';
import { IndexService, SearchService } from '../services';

@Controller('backend-search')
export class SearchController {
  constructor(
    private searchService: SearchService,
    private indexService: IndexService,
  ) {}

  @Get('/search')
  search(@Query('query') query: string) {
    return this.searchService.search([
      {
        indexName: 'searchable',
        query,
        params: {
          hitsPerPage: 20,
          attributesToHighlight: [],
        },
      },
      {
        indexName: 'searchable',
        query,
        params: {
          hitsPerPage: 10,
          attributesToHighlight: [],
        },
      },
    ]);
  }

  // @Get('/indexAll')
  // @UseGuards(PermGuard)
  // async indexAll(@User() user: Player) {
  //   return Promise.all([
  //     this.indexService.indexPlayers(),
  //     this.indexService.indexClubs(),
  //     this.indexService.indexCompetitionEvents(),
  //     this.indexService.indexTournamentEvents(),
  //   ]);
  // }

  // @Get('/indexPlayers')
  // async indexPlayers() {
  //   return this.indexService.indexPlayers();
  // }

  // @Get('/indexClubs')
  // async indexClubs() {
  //   return this.indexService.indexClubs();
  // }

  // @Get('/indexCompetitionEvents')
  // async indexCompetitionEvents() {
  //   return this.indexService.indexCompetitionEvents();
  // }

  // @Get('/indexTournamentEvents')
  // async indexTournamentEvents() {
  //   return this.indexService.indexTournamentEvents();
  // }
}