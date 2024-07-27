import { isPlatformBrowser } from '@angular/common';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withFetch,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  APP_ID,
  ApplicationConfig,
  PLATFORM_ID,
  importProvidersFrom,
  isDevMode,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import {
  provideClientHydration,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { AuthInterceptor } from '@app/frontend-modules-auth';
import { GraphQLModule } from '@app/frontend-modules-graphql';
import { SEO_CONFIG } from '@app/frontend-modules-seo';
import { TranslateModule } from '@app/frontend-modules-translation';
import { BASE_URL } from '@app/frontend-utils';
import { AuthModule } from '@auth0/auth0-angular';
import { appRoutes } from './app.routes';

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
      TranslateModule.forRoot({
        api: `/api/v1/translate/i18n/`,
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
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    {
      provide: BASE_URL,
      useFactory: (platformId: string) => {
        if (isPlatformBrowser(platformId)) {
          return window.location.origin;
        }
        return (
          process?.env?.['BASE_URL'] ||
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
      useClass: AuthInterceptor,
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
