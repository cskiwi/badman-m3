import {
  AvaliableLanguages,
  languages,
} from '@app/frontend-modules-translation/languages';
import { TranslateService } from '@ngx-translate/core';
import { SsrCookieService } from 'ngx-cookie-service-ssr';
import { lastValueFrom } from 'rxjs';

export function langulageInitializer(
  translate: TranslateService,
  cookieService: SsrCookieService,
) {
  return async () => {
    const setLang = async (savedLang?: AvaliableLanguages) => {
      if (!savedLang) {
        return;
      }

      const values = languages.get(
        savedLang ? savedLang : AvaliableLanguages.nl_BE,
      );

      if (!values) {
        return;
      }

      await setLanguage(values.translate, translate, cookieService);
    };

    try {
      translate.addLangs([...languages.keys()]);
      const savedLang =
        (cookieService.get('translation.language') as AvaliableLanguages) ||
        AvaliableLanguages.nl_BE;

      await setLang(savedLang);
    } catch (err) {
      console.error('Error', err);
    }
  };
}

export async function setLanguage(
  translateFormat: string,
  translateService: TranslateService,
  cookieService: SsrCookieService,
) {
  // Set cookie
  cookieService.set('translation.language', translateFormat);

  // Set values
  await lastValueFrom(translateService.use(translateFormat));
}
