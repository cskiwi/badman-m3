import { provideServerRendering } from '@angular/ssr';
import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNGForServer } from './primeng-theme.provider';

import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(), 
    provideNoopAnimations(),
    // Override PrimeNG config for server to ensure no theme issues during SSR
    ...providePrimeNGForServer()
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
