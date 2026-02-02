import { Component, computed, forwardRef, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';

import STATES_DATA from '../states.json';

export interface CountryOption {
  code: string;
  name: string;
}

const UNIQUE_COUNTRIES = [...new Set(STATES_DATA.map((s) => s.country))];

@Component({
  selector: 'app-country-select',
  standalone: true,
  imports: [FormsModule, SelectModule, TranslateModule],
  template: `
    <p-select
      [options]="countries()"
      [ngModel]="value()"
      (ngModelChange)="onValueChange($event)"
      optionLabel="name"
      optionValue="code"
      [filter]="true"
      [filterBy]="'name'"
      [placeholder]="'all.competition.edit.info.country.placeholder' | translate"
      [showClear]="true"
      [disabled]="disabled()"
      appendTo="body"
      styleClass="w-full"
    />
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CountrySelectComponent),
      multi: true,
    },
  ],
})
export class CountrySelectComponent implements ControlValueAccessor {
  private readonly translateService = inject(TranslateService);

  readonly value = signal<string | null>(null);
  readonly disabled = signal(false);

  private onChange: (value: string | null) => void = () => {
    /* noop - replaced by registerOnChange */
  };
  private onTouched: () => void = () => {
    /* noop - replaced by registerOnTouched */
  };

  // Track language changes reactively
  private readonly currentLang = toSignal(
    this.translateService.onLangChange.pipe(
      map((event) => event.lang),
      startWith(this.translateService.currentLang || this.translateService.defaultLang || 'en'),
    ),
  );

  readonly countries = computed(() => {
    const lang = this.currentLang() || 'en';

    let displayNames: Intl.DisplayNames | null = null;
    try {
      displayNames = new Intl.DisplayNames([lang], { type: 'region' });
    } catch {
      displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    }

    return UNIQUE_COUNTRIES.map((code) => {
      let name: string;
      try {
        name = displayNames!.of(code.toUpperCase()) || code.toUpperCase();
      } catch {
        name = code.toUpperCase();
      }
      return { code, name };
    }).sort((a, b) => a.name.localeCompare(b.name));
  });

  writeValue(value: string | null): void {
    this.value.set(value || null);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onValueChange(value: string | null): void {
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }
}
