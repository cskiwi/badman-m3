import { Module } from '@nestjs/common';
import { algoliasearch, SearchClient } from 'algoliasearch';
import { ALGOLIA_CLIENT } from './client';
import { SearchController } from './controllers';
import { ISearchConfig } from './interfaces';
import { IndexService, SearchService } from './services';

@Module({
  controllers: [SearchController],
  providers: [SearchService, IndexService],
})
export class SearchModule {
  static forRoot(config: ISearchConfig) {
    return {
      module: SearchModule,
      providers: [
        {
          provide: ALGOLIA_CLIENT,
          useFactory: () =>
            algoliasearch(config.appId, config.apiKey, config.clientOptions),
        },
      ],
    };
  }
}
 