import {
  InjectionToken,
  Injector,
  ModuleWithProviders,
  NgModule,
  TransferState,
  makeStateKey,
} from '@angular/core';
import { ApolloLink, InMemoryCache } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { BASE_URL } from '@app/frontend-utils';
import { AuthService } from '@auth0/auth0-angular';
import { APOLLO_OPTIONS, ApolloModule } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { lastValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

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
  injector: Injector,
  transferState: TransferState,
  baseUrl: string,
  config?: GraphqlConfiguration,
) {
  const basic = setContext(() => ({
    headers: {
      Accept: 'charset=utf-8',
    },
  }));

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

  const auth = setContext(async (_, { headers }) => {
    if (isBrowser) {
      const authService = injector.get(AuthService);
      const isAuthenticated = await lastValueFrom(
        authService.isAuthenticated$.pipe(take(1)),
      );
      if (isAuthenticated) {
        const token = await lastValueFrom(authService.getAccessTokenSilently());
        if (token) {
          headers = {
            ...headers,
            Authorization: `Bearer ${token}`,
          };
        }
      }
    }

    return {
      headers: {
        ...headers,
        Accept: 'application/json; charset=utf-8',
        'X-App-Magic': '1',
      },
    };
  });

  const link = ApolloLink.from([
    basic,
    auth,
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
        Injector,
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
