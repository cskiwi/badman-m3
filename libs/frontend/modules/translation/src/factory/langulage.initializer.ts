import { isPlatformBrowser, LOCATION_INITIALIZED } from '@angular/common';
import { effect, Injector, PLATFORM_ID } from '@angular/core';
import { AvaliableLanguages, languages } from '@app/frontend-modules-translation/languages';
import { TranslateService } from '@ngx-translate/core';
import { lastValueFrom } from 'rxjs';

export function langulageInitializer(
  translate: TranslateService,
  injector: Injector,
  user?: { id: string },
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

      await setLanguage(values.translate, translate);
    };

    try {
      await injector.get(LOCATION_INITIALIZED, Promise.resolve(null));
      const platform = injector.get(PLATFORM_ID);

      translate.addLangs([...languages.keys()]);
      translate.setDefaultLang(AvaliableLanguages.nl_BE);

      const savedLang = isPlatformBrowser(platform)
        ? (localStorage.getItem('translation.language') as AvaliableLanguages)
        : undefined;

      if (!savedLang && isPlatformBrowser(platform)) {
        effect(
          () => {
            // if (authenticateService.loggedIn()) {
            //   if (authenticateService.user()?.setting?.language) {
            //     savedLang = authenticateService.user()?.setting?.language;
            //   }
            // }
            setLang(savedLang);
          },
          {
            injector,
          },
        );
      }

      // Set language if saved
      setLang(savedLang ?? AvaliableLanguages.nl_BE);
    } catch (err) {
      console.error('Error', err);
    }
  };
}

export async function setLanguage(
  translateFormat: string,
  translateService: TranslateService,
) {
  // Set values
  await lastValueFrom(translateService.use(translateFormat));
}
