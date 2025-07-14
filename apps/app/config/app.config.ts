import { isPlatformBrowser } from '@angular/common';
import { HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import {
  APP_ID,
  ApplicationConfig,
  PLATFORM_ID,
  importProvidersFrom,
  inject,
  isDevMode,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { AuthInterceptor } from '@app/frontend-modules-auth/interceptor';
import { provideGraphQL } from '@app/frontend-modules-graphql';
import { SEO_CONFIG } from '@app/frontend-modules-seo';
import { langulageInitializer, provideTranslation } from '@app/frontend-modules-translation';
import { BASE_URL } from '@app/frontend-utils';
import { AuthModule } from '@auth0/auth0-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SsrCookieService } from 'ngx-cookie-service-ssr';
import { MomentModule } from 'ngx-moment';
import { environment } from '../src/environments/environment';
import { appRoutes } from './app.routes';
import { providePrimeNGWithTheme } from './primeng-theme.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideGraphQL(),
    importProvidersFrom(
      MomentModule.forRoot(),
      AuthModule.forRoot({
        domain: environment.Auth0IssuerUrl,
        clientId: environment.Auth0ClientId,
        useRefreshTokens: true,
        useRefreshTokensFallback: true,
        useCookiesForTransactions: true,
        authorizationParams: {
          redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
          audience: environment.Auth0Audience,
        },
        cacheLocation: 'localstorage',
        httpInterceptor: {
          allowedList: [
            {
              uriMatcher: (uri) => uri.indexOf('v1') > -1,
              allowAnonymous: true,
            },
          ],
        },
      }),
      TranslateModule.forRoot(
        provideTranslation({
          api: `/api/v1/translate/i18n/`,
        }),
      ),
    ),
    provideClientHydration(
      withHttpTransferCacheOptions({
        includePostRequests: true,
      }),
    ),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withViewTransitions()),
    provideAnimationsAsync(),
    // PrimeNG configuration with theme
    ...providePrimeNGWithTheme(),
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
        return environment.baseUrl || `http://localhost:5000`;
      },
      deps: [PLATFORM_ID],
    },
    { provide: APP_ID, useValue: 'starter' },
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
    provideAppInitializer(() => {
      const initializerFn = langulageInitializer(inject(TranslateService), inject(SsrCookieService));
      return initializerFn();
    }),
  ],
};
