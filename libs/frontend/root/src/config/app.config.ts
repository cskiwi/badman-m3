import {
  APP_ID,
  ApplicationConfig,
  PLATFORM_ID,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { appRoutes } from './app.routes';
import {
  provideClientHydration,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withFetch,
} from '@angular/common/http';
import { BASE_URL } from '@app/frontend-utils';
import { isPlatformBrowser } from '@angular/common';
import { GraphQLModule } from '@app/frontend-modules-grahql';
import { AuthHttpInterceptor, AuthModule } from '@auth0/auth0-angular';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideNativeDateAdapter } from '@angular/material/core';
import { SEO_CONFIG } from '@app/frontend-seo';
import { TranslationModule } from '@app/frontend-translation';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      GraphQLModule.forRoot(),
      AuthModule.forRoot({
        domain: 'badvlasim.eu.auth0.com',
        clientId: '2LqkYZMbrTTXEE0OMkQJLmpRrOVQheoF',
        useRefreshTokens: true,
        useRefreshTokensFallback: true,
        authorizationParams: {
          redirect_uri:
            typeof window !== 'undefined' ? window.location.origin : '',
          audience: 'ranking-simulation',
        },
        httpInterceptor: {
          allowedList: [
            {
              uriMatcher: (uri) => uri.indexOf('v1') > -1,
              allowAnonymous: true,
            },
          ],
        },
      }),
      TranslationModule.forRoot({
        api: `https://badman.app/api/v1/translate/i18n/`,
      }),
    ),
    provideClientHydration(
      withHttpTransferCacheOptions({
        includePostRequests: true,
      }),
    ),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withViewTransitions()),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    provideHttpClient(withFetch()),
    {
      provide: BASE_URL,
      useFactory: (platformId: string) => {
        if (isPlatformBrowser(platformId)) {
          return window.location.origin;
        }
        return (
          process.env?.['BASE_URL'] ||
          `http://localhost:${process.env['PORT'] || 4200}`
        );
      },
      deps: [PLATFORM_ID],
    },
    { provide: APP_ID, useValue: 'starter' },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline', subscriptSizing: 'dynamic' },
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthHttpInterceptor,
      multi: true,
    },
    {
      provide: SEO_CONFIG,
      useFactory: (baseUrl: string) => ({
        siteName: 'Badminton',
        siteUrl: 'https://badman.app',
        imageEndpoint: `${baseUrl}/api/v1/images`,
      }),
      deps: [BASE_URL],
    },
  ],
};
