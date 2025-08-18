import { Injectable } from '@angular/core';
import dayjs from 'dayjs';
import { BehaviorSubject, Observable } from 'rxjs';
import { DayjsLocale } from './types';

@Injectable({
  providedIn: 'root',
})
export class DayjsLocaleService {
  private readonly localeSubject = new BehaviorSubject<DayjsLocale>('en');

  readonly localeChange$: Observable<DayjsLocale> = this.localeSubject.asObservable();

  getLocale(): DayjsLocale {
    return this.localeSubject.value;
  }

  setLocale(locale: DayjsLocale): void {
    if (locale !== this.localeSubject.value) {
      this.localeSubject.next(locale);
      dayjs.locale(locale);
    }
  }

  async loadAndSetLocale(locale: DayjsLocale): Promise<void> {
    // We statically import supported locales at module load time. Just set it.
    if (locale === 'nl' || locale === 'en' || locale === 'fr') {
      await import(`dayjs/locale/${locale}`);
    } else {
      console.warn(`Unsupported locale: ${locale}, falling back to 'en'`);
      this.setLocale('en');
    }
  }
}
