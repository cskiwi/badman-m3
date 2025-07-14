import { DynamicModule, FactoryProvider, Module, ModuleMetadata, Type } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Client } from 'typesense';
import { SearchController } from './controllers';
import { ISearchConfig } from './interfaces';
import { IndexService, SearchService } from './services';
import { TYPESENSE_CLIENT } from './utils';

@Module({
  imports: [JwtModule],
  controllers: [SearchController],
  providers: [SearchService, IndexService],
  exports: [IndexService, SearchService],
})
export class SearchModule {
  static forRootAsync(options: SearchModuleRegisterAsyncOptions): DynamicModule {
    return {
      module: SearchModule,
      global: options.isGlobal,
      providers: [
        { provide: 'SEARCH_CONFIG', useFactory: options.useFactory, inject: options.inject },
        {
          provide: TYPESENSE_CLIENT,
          useFactory: (config: ISearchConfig) => (!config.typesense ? undefined : new Client(config.typesense)),
          inject: ['SEARCH_CONFIG'],
        },
      ],
      exports: [TYPESENSE_CLIENT, IndexService, SearchService],
    };
  }

  static forRoot(config: ISearchConfig) {
    return {
      module: SearchModule,
      providers: [
        { provide: TYPESENSE_CLIENT, useFactory: () => new Client(config.typesense) },
        { provide: 'SEARCH_CONFIG', useValue: config },
      ],
      exports: [TYPESENSE_CLIENT, IndexService, SearchService],
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory: (...args: any[]) => ISearchConfig | Promise<ISearchConfig>;
  inject?: FactoryProvider['inject'];
}
