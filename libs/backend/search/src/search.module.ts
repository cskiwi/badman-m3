import { Module } from '@nestjs/common';
import { algoliasearch } from 'algoliasearch';
import { ALGOLIA_CLIENT } from './client';
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
