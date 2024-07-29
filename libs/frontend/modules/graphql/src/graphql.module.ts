import { isPlatformBrowser } from '@angular/common';
import {
  InjectionToken,
  Injector,
  ModuleWithProviders,
  NgModule,
  PLATFORM_ID,
  TransferState,
  makeStateKey,
} from '@angular/core';
import { ApolloLink, InMemoryCache } from '@apollo/client/core';
import { BASE_URL } from '@app/frontend-utils';
import { APOLLO_OPTIONS, ApolloModule } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';

const STATE_KEY = makeStateKey<any>('apollo.state');
export const APOLLO_CACHE = new InjectionToken<InMemoryCache>('apollo-cache');
export const GRAPHQL_CONFIG_TOKEN = new InjectionToken<GraphqlConfiguration>(
  'graphql.config',
);

export type GraphqlConfiguration = Readonly<{
  suffix?: string;
  connectToDevTools?: boolean;
}>;

export function createApollo(
  httpLink: HttpLink,
  cache: InMemoryCache,
  platformId: string,
  transferState: TransferState,
  baseUrl: string,
  config?: GraphqlConfiguration,
) {
  const isBrowser = isPlatformBrowser(platformId);

  if (isBrowser) {
    const state = transferState.get<any>(STATE_KEY, null);
    cache.restore(state);
  } else {
    transferState.onSerialize(STATE_KEY, () => {
      return cache.extract();
    });
    // Reset cache after extraction to avoid sharing between requests
    cache.reset();
  }

  const link = ApolloLink.from([
    // basic,
    // auth,
    httpLink.create({
      uri: `${baseUrl}/${config?.suffix ?? 'graphql'}`,
    }),
  ]);

  return {
    link,
    persistedQueries: {
      ttl: 900, // 15 minutes
    },
    cache,
    connectToDevTools: config?.connectToDevTools ?? true,
  };
}

@NgModule({
  exports: [ApolloModule],
  imports: [ApolloModule],
  providers: [
    {
      provide: APOLLO_CACHE,
      useValue: new InMemoryCache(),
    },
    {
      provide: APOLLO_OPTIONS,
      useFactory: createApollo,
      deps: [
        HttpLink,
        APOLLO_CACHE,
        PLATFORM_ID,
        TransferState,
        BASE_URL,
        GRAPHQL_CONFIG_TOKEN,
      ],
    },
  ],
})
export class GraphQLModule {
  static forRoot(
    config?: GraphqlConfiguration,
  ): ModuleWithProviders<GraphQLModule> {
    return {
      ngModule: GraphQLModule,
      providers: [{ provide: GRAPHQL_CONFIG_TOKEN, useValue: config }],
    };
  }
}
