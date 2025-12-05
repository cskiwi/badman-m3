import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { ITranslateConfig } from './interfaces';

export const provideTranslation = (config: ITranslateConfig) => ({
  fallbackLang: 'en',
  lang: 'en',
  loader: provideTranslateHttpLoader({
    prefix: `${config.api}`,
    suffix: '',
  }),
});
