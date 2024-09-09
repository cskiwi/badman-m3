import { Module, OnModuleInit } from '@nestjs/common';
import { algoliasearch } from 'algoliasearch';
import { Client } from 'typesense';
import { ALGOLIA_CLIENT, TYPESENSE_CLIENT } from './client';
import { IndexController, SearchController } from './controllers';
import { ISearchConfig } from './interfaces';
import { IndexService, SearchService } from './services';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [JwtModule, ConfigModule],
  controllers: [SearchController, IndexController],
  providers: [SearchService, IndexService],
})
export class SearchModule  {
  static forRoot(config: ISearchConfig) {
    return {
      module: SearchModule,
      providers: [
        {
          provide: ALGOLIA_CLIENT,
          useFactory: () =>
            algoliasearch(config.algolia.appId, config.algolia.apiKey, config.algolia.clientOptions),
        },
        {
          provide: TYPESENSE_CLIENT,
          useFactory: () =>
            new Client(config.typesense),
        },
      ],
    };
  }
}
