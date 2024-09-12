import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { algoliasearch } from 'algoliasearch';
import { Client } from 'typesense';
import { IndexingClient } from './client';
import { IndexController, SearchController } from './controllers';
import { ISearchConfig } from './interfaces';
import { IndexService, SearchService } from './services';

@Module({
  imports: [JwtModule],
  controllers: [SearchController, IndexController],
  providers: [SearchService, IndexService],
})
export class SearchModule {
  static forRoot(config: ISearchConfig) {
    return {
      module: SearchModule,
      providers: [
        {
          provide: IndexingClient.ALGOLIA_CLIENT,
          useFactory: () =>
            algoliasearch(
              config.algolia.appId,
              config.algolia.apiKey,
              config.algolia.clientOptions,
            ),
        },
        {
          provide: IndexingClient.TYPESENSE_CLIENT,
          useFactory: () => new Client(config.typesense),
        },
      ],
    };
  }
}
