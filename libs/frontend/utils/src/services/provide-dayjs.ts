import { 
  EnvironmentProviders, 
  makeEnvironmentProviders, 
  Provider,
  InjectionToken
} from '@angular/core';
import { DayjsService } from './dayjs.service';
import { DayjsLocaleService } from './dayjs-locale.service';
import { NgxDayjsConfig } from './types';

export const NGX_DAYJS_CONFIG = new InjectionToken<NgxDayjsConfig>('NGX_DAYJS_CONFIG');

export interface DayjsProviderOptions {
  config?: NgxDayjsConfig;
}

/**
 * Provides modern standalone Angular providers for Dayjs integration.
 * 
 * @example
 * ```typescript
 * // app.config.ts
 * import { provideDayjs } from '@app/frontend-utils/services';
 * 
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideDayjs({
 *       config: {
 *         defaultLocale: 'en',
 *         enablePlugins: ['utc', 'timezone', 'relativeTime']
 *       }
 *     })
 *   ]
 * };
 * ```
 */
export function provideDayjs(options?: DayjsProviderOptions): EnvironmentProviders {
  const providers: Provider[] = [
    DayjsService,
    DayjsLocaleService,
    {
      provide: NGX_DAYJS_CONFIG,
      useValue: options?.config || {}
    }
  ];

  return makeEnvironmentProviders(providers);
}