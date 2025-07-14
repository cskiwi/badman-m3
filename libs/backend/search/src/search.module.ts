import { DynamicModule, FactoryProvider, Module, ModuleMetadata, Type } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Client } from 'typesense';
import { IndexController, SearchController } from './controllers';
import { ISearchConfig } from './interfaces';
import { IndexService, SearchService } from './services';
import { TYPESENSE_CLIENT } from './utils';

@Module({ imports: [JwtModule], controllers: [SearchController, IndexController], providers: [SearchService, IndexService] })
export class SearchModule {
  static forRootAsync(options: SearchModuleRegisterAsyncOptions): DynamicModule {
    return {
      module: SearchModule,
      providers: [
        { provide: 'SEARCH_CONFIG', useFactory: options.useFactory, inject: options.inject },
        {
          provide: TYPESENSE_CLIENT,
          useFactory: (config: ISearchConfig) => (!config.typesense ? undefined : new Client(config.typesense)),
          inject: ['SEARCH_CONFIG'],
        },
      ],
      exports: [TYPESENSE_CLIENT],
    };
  }

  static forRoot(config: ISearchConfig) {
    return {
      module: SearchModule,
      providers: [
        { provide: TYPESENSE_CLIENT, useFactory: () => new Client(config.typesense) },
        { provide: 'SEARCH_CONFIG', useValue: config },
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory: (...args: any[]) => ISearchConfig | Promise<ISearchConfig>;
  inject?: FactoryProvider['inject'];
}
