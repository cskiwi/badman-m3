import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DayjsLocale } from './types';
import dayjs from 'dayjs';

@Injectable({
  providedIn: 'root'
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
    try {
      // Dynamically import the locale based on the provided value
      switch (locale) {
        case 'nl':
          await import('dayjs/locale/nl');
          break;
        case 'en':
          await import('dayjs/locale/en');
          break;
        case 'fr':
          await import('dayjs/locale/fr');
          break;
        default:
          console.warn(`Unsupported locale: ${locale}, falling back to 'en'`);
          await import('dayjs/locale/en');
          this.setLocale('en');
          return;
      }
      
      this.setLocale(locale);
    } catch (error) {
      console.error(`Failed to load locale ${locale}:`, error);
      console.warn(`Falling back to 'en'`);
      await import('dayjs/locale/en');
      this.setLocale('en');
    }
  }
}