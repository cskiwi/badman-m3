import { isPlatformBrowser } from '@angular/common';
import {
  InjectionToken,
  PLATFORM_ID,
  TransferState,
  makeStateKey,
  inject,
  EnvironmentProviders,
  makeEnvironmentProviders,
  NgModule,
  ModuleWithProviders,
} from '@angular/core';
import { ApolloLink, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core';
import { BASE_URL } from '@app/frontend-utils';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';

const STATE_KEY = makeStateKey<NormalizedCacheObject>('apollo.state');
export const APOLLO_CACHE = new InjectionToken<InMemoryCache>('apollo-cache');
export const GRAPHQL_CONFIG_TOKEN = new InjectionToken<GraphqlConfiguration>(
  'graphql.config',
);

export type GraphqlConfiguration = Readonly<{
  suffix?: string;
  devToolsEnabled?: boolean;
}>;

export function provideGraphQL(
  config?: GraphqlConfiguration,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: APOLLO_CACHE,
      useValue: new InMemoryCache(),
    },
    {
      provide: GRAPHQL_CONFIG_TOKEN,
      useValue: config,
    },
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      const cache = inject(APOLLO_CACHE);
      const platformId = inject(PLATFORM_ID);
      const transferState = inject(TransferState);
      const baseUrl = inject(BASE_URL);
      const graphqlConfig = inject(GRAPHQL_CONFIG_TOKEN, { optional: true });

      return createApollo(
        httpLink,
        cache,
        platformId as string,
        transferState,
        baseUrl,
        graphqlConfig ?? undefined,
      );
    }),
  ]);
}

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
    const state = transferState.get<NormalizedCacheObject | null>(STATE_KEY, null);
    if (state) {
      cache.restore(state);
    }
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
    devtools: {
      enabled: config?.devToolsEnabled ?? true,
    },
  };
}

// Legacy NgModule approach - deprecated, use provideGraphQL instead
@NgModule({
  providers: [],
})
export class GraphQLModule {
  static forRoot(
    config?: GraphqlConfiguration,
  ): ModuleWithProviders<GraphQLModule> {
    console.warn(
      'GraphQLModule.forRoot() is deprecated. Use provideGraphQL() in app.config.ts instead.'
    );
    return {
      ngModule: GraphQLModule,
      providers: [
        {
          provide: APOLLO_CACHE,
          useValue: new InMemoryCache(),
        },
        {
          provide: GRAPHQL_CONFIG_TOKEN,
          useValue: config,
        },
        // Note: This won't work properly with the new apollo-angular
        // Users should migrate to provideGraphQL()
      ],
    };
  }
}
