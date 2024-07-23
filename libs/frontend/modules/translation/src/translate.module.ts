import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  APP_INITIALIZER,
  InjectionToken,
  Injector,
  ModuleWithProviders,
  NgModule,
} from '@angular/core';
import { DateAdapter } from '@angular/material/core';
import {
  TranslateLoader,
  TranslateModule as NgxTranslateModule,
  TranslateParser,
  TranslateService,
} from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { langulageInitializer } from './factory';
import { ITranslateConfig } from './interfaces';
import { USER } from '@app/frontend-utils';
import { SingleBracketInterpolation } from './services';

export const TRANSLATE_CONFIG = new InjectionToken<ITranslateConfig>('TRANSLATE_CONFIG');

@NgModule({
  imports: [
    CommonModule,
    NgxTranslateModule.forRoot({
      defaultLanguage: 'en',
      parser: {
        provide: TranslateParser,
        useClass: SingleBracketInterpolation,
      },
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient, config: ITranslateConfig) =>
          new TranslateHttpLoader(http, config.api, ''),
        deps: [HttpClient, TRANSLATE_CONFIG],
      },
    }),
  ],
  providers: [
    SingleBracketInterpolation,
    {
      provide: APP_INITIALIZER,
      useFactory: langulageInitializer,
      deps: [TranslateService, Injector, DateAdapter, USER],
      multi: true,
    },
  ],
})
export class TranslateModule {
  public static forRoot(config: ITranslateConfig): ModuleWithProviders<TranslateModule> {
    return {
      ngModule: TranslateModule,
      providers: [{ provide: TRANSLATE_CONFIG, useValue: config }],
    };
  }
}
