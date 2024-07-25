import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideServerRendering } from '@angular/platform-server';
import { provideISR, isrHttpInterceptors } from '@rx-angular/isr/server';

import { appConfig } from './app.config';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideNoopAnimations(),
    provideISR(), // 👈 Use it in config providers

    // register ISR Http Interceptors
    provideHttpClient(withInterceptors(isrHttpInterceptors)),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
