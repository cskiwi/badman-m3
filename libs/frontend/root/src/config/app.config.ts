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
import { HTTP_INTERCEPTORS, provideHttpClient, withFetch } from '@angular/common/http';
import { BASE_URL } from '@app/frontend-utils';
import { isPlatformBrowser } from '@angular/common';
import { GraphQLModule } from '@app/frontend-modules-grahql';
import { AuthHttpInterceptor, AuthModule } from '@auth0/auth0-angular';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideNativeDateAdapter } from '@angular/material/core';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      GraphQLModule.forRoot({
        api: './graphql',
      }),
      AuthModule.forRoot({
        domain: 'https://purr.eu.auth0.com',
        clientId: 'Xwj4PH6uePcn6nFSI5tPNO9OPOKFYdrv',
        useRefreshTokens: true,
        useRefreshTokensFallback: true,
        authorizationParams: {
          redirect_uri:
            typeof window !== 'undefined' ? window.location.origin : '',
          audience: 'starter',
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
        return process.env?.['BASE_URL'] || 'http://localhost:4200';
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
  ],
};
