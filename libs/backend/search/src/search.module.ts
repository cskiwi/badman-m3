import { DynamicModule, FactoryProvider, Module, ModuleMetadata, Type } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { algoliasearch } from 'algoliasearch';
import { Client } from 'typesense';
import { IndexController, SearchController } from './controllers';
import { ISearchConfig } from './interfaces';
import { IndexService, SearchService } from './services';
import { DEFAULT_CLIENTS, IndexingClient } from './utils';

@Module({
  imports: [JwtModule],
  controllers: [SearchController, IndexController],
  providers: [SearchService, IndexService],
})
export class SearchModule {
  static forRootAsync(options: SearchModuleRegisterAsyncOptions): DynamicModule {
    return {
      module: SearchModule,
      providers: [
        {
          provide: 'SEARCH_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject,
        },
        {
          provide: IndexingClient.ALGOLIA_CLIENT,
          useFactory: (config: ISearchConfig) =>
            !DEFAULT_CLIENTS.includes(IndexingClient.ALGOLIA_CLIENT)
              ? undefined
              : algoliasearch(config.algolia.appId, config.algolia.apiKey, config.algolia.clientOptions),
          inject: ['SEARCH_CONFIG'],
        },
        {
          provide: IndexingClient.TYPESENSE_CLIENT,
          useFactory: (config: ISearchConfig) =>
            !DEFAULT_CLIENTS.includes(IndexingClient.TYPESENSE_CLIENT) ? undefined : new Client(config.typesense),
          inject: ['SEARCH_CONFIG'],
        },
      ],
      exports: [IndexingClient.ALGOLIA_CLIENT, IndexingClient.TYPESENSE_CLIENT],
    };
  }

  static forRoot(config: ISearchConfig) {
    return {
      module: SearchModule,
      providers: [
        {
          provide: IndexingClient.ALGOLIA_CLIENT,
          useFactory: () => algoliasearch(config.algolia.appId, config.algolia.apiKey, config.algolia.clientOptions),
        },
        {
          provide: IndexingClient.TYPESENSE_CLIENT,
          useFactory: () => new Client(config.typesense),
        },
        {
          provide: 'SEARCH_CONFIG',
          useValue: config,
        },
      ],
    };
  }
}

export interface SearchOptionsFactory {
  createSearchOptions(): ISearchConfig;
}

export interface SearchModuleRegisterAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  isGlobal?: boolean;
  useClass?: Type<SearchOptionsFactory>;
  useExisting?: Type<SearchOptionsFactory>;
  useFactory: (...args: any[]) => ISearchConfig | Promise<ISearchConfig>;
  inject?: FactoryProvider['inject'];
}
