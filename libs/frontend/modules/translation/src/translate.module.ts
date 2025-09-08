import { inject } from '@angular/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { ITranslateConfig } from './interfaces';
import { BASE_URL } from '@app/frontend-utils';
import { RootTranslateServiceConfig } from '@ngx-translate/core';

export const provideTranslation = (config: ITranslateConfig) => ({
  fallbackLang: 'en',
  lang: 'en',
  loader: provideTranslateHttpLoader({
    prefix: `${config.api}`,
    suffix: '',
  }),
});
