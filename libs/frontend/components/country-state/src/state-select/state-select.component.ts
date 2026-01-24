import { Component, computed, effect, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TranslateModule } from '@ngx-translate/core';

import STATES_DATA from '../states.json';

export interface StateOption {
  code: string;
  name: string;
}

function kebabToTitleCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

@Component({
  selector: 'app-state-select',
  standalone: true,
  imports: [FormsModule, SelectModule, TranslateModule],
  template: `
    <p-select
      [options]="states()"
      [ngModel]="value()"
      (ngModelChange)="onValueChange($event)"
      optionLabel="name"
      optionValue="code"
      [filter]="true"
      [filterBy]="'name'"
      [placeholder]="'all.competition.edit.info.state.placeholder' | translate"
      [showClear]="true"
      [disabled]="disabled() || states().length === 0"
      appendTo="body"
      styleClass="w-full"
    />
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StateSelectComponent),
      multi: true,
    },
  ],
})
export class StateSelectComponent implements ControlValueAccessor {
  /** The country code to filter states by (2-letter ISO code, lowercase) */
  readonly country = input<string | null>(null);

  readonly value = signal<string | null>(null);
  readonly disabled = signal(false);

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  readonly states = computed(() => {
    const countryCode = this.country();
    if (!countryCode) return [];

    return STATES_DATA.filter((s) => s.country === countryCode.toLowerCase())
      .map((s) => ({
        code: s.code,
        name: kebabToTitleCase(s.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  constructor() {
    // Reset state value when country changes and current value is not in the new country's states
    effect(() => {
      const states = this.states();
      const currentValue = this.value();
      if (currentValue && states.length > 0 && !states.some((s) => s.code === currentValue)) {
        this.value.set(null);
        this.onChange(null);
      } else if (states.length === 0 && currentValue) {
        this.value.set(null);
        this.onChange(null);
      }
    });
  }

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
