import { PLATFORM_ID, inject, Provider, APP_INITIALIZER, EnvironmentProviders } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';


/**
 * Provides PrimeNG configuration with theme for browser environments
 */
export function providePrimeNGWithTheme(): (Provider | EnvironmentProviders)[] {
  return [
    providePrimeNG({
      theme: {
        preset: Aura
      }
    }),
  ];
}

/**
 * Provides PrimeNG configuration for server environments (SSR)
 */
export function providePrimeNGForServer(): EnvironmentProviders[] {
  return [
    providePrimeNG({
      theme: 'none', // No theme for SSR to avoid errors
    }),
  ];
}
