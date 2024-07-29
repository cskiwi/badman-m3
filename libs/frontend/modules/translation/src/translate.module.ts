import { HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ITranslateConfig } from './interfaces';
import { BASE_URL } from '@app/frontend-utils';

export const provideTranslation = (config: ITranslateConfig) => ({
  defaultLanguage: 'en',
  useDefaultLang: true,
  loader: {
    provide: TranslateLoader,
    useFactory: (http: HttpClient, baseUrl: string) =>
      new TranslateHttpLoader(http, baseUrl + config.api, ''),
    deps: [HttpClient, BASE_URL],
  },
});
