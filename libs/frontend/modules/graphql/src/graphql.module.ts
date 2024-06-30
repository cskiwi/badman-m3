import {
  InjectionToken,
  ModuleWithProviders,
  NgModule,
  TransferState,
  isDevMode,
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
  config: GraphqlConfiguration,
  httpLink: HttpLink,
  cache: InMemoryCache,
  transferState: TransferState,
  BASE_URL: string,
) {
  const isBrowser = transferState.hasKey<any>(STATE_KEY);

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

  console.log(`Setting up Apollo with API: ${BASE_URL}/graphql`);

  const link = ApolloLink.from([
    httpLink.create({
      uri: `${BASE_URL}/${config?.suffix ?? 'graphql'}`,
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
        GRAPHQL_CONFIG_TOKEN,
        HttpLink,
        APOLLO_CACHE,
        TransferState,
        BASE_URL,
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
