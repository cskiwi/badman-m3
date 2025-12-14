import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TournamentEvent } from '@app/models';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    InputTextModule,
    DatePickerModule,
    CheckboxModule,
    MessageModule,
  ],
  templateUrl: './general-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralSettingsComponent {
  tournament = input.required<TournamentEvent>();
  updating = input<boolean>(false);
  updateError = input<string | null>(null);

  saveSettingsRequested = output<{
    name?: string;
    firstDay?: Date;
    closeDate?: Date;
    enrollmentOpenDate?: Date;
    enrollmentCloseDate?: Date;
    official?: boolean;
    allowGuestEnrollments?: boolean;
    schedulePublished?: boolean;
  }>();

  // Tournament settings form
  settingsForm = new FormGroup({
    name: new FormControl<string>('', [Validators.required, Validators.maxLength(255)]),
    tournamentDates: new FormControl<Date[] | null>(null),
    enrollmentDates: new FormControl<Date[] | null>(null),
    official: new FormControl<boolean>(false),
    allowGuestEnrollments: new FormControl<boolean>(false),
    schedulePublished: new FormControl<boolean>(false),
  });

  constructor() {
    // Initialize form when tournament changes
    effect(() => {
      const t = this.tournament();
      if (t) {
        // Tournament dates (firstDay to last day)
        const tournamentDates =
          t.firstDay && t.closeDate
            ? [new Date(t.firstDay), new Date(t.closeDate)]
            : t.firstDay
              ? [new Date(t.firstDay)]
              : null;

        // Enrollment open/close dates
        const enrollmentDates =
          t.enrollmentOpenDate && t.enrollmentCloseDate
            ? [new Date(t.enrollmentOpenDate), new Date(t.enrollmentCloseDate)]
            : null;

        this.settingsForm.patchValue({
          name: t.name,
          tournamentDates,
          enrollmentDates,
          official: t.official ?? false,
          allowGuestEnrollments: t.allowGuestEnrollments ?? false,
          schedulePublished: t.schedulePublished ?? false,
        });
      }
    });
  }

  saveSettings(): void {
    if (this.settingsForm.invalid) return;

    const values = this.settingsForm.value;

    // Extract dates from range pickers
    const tournamentDates = values.tournamentDates as Date[] | null;
    const enrollmentDates = values.enrollmentDates as Date[] | null;

    this.saveSettingsRequested.emit({
      name: values.name ?? undefined,
      firstDay: tournamentDates?.[0] ?? undefined,
      closeDate: tournamentDates?.[1] ?? tournamentDates?.[0] ?? undefined,
      enrollmentOpenDate: enrollmentDates?.[0] ?? undefined,
      enrollmentCloseDate: enrollmentDates?.[1] ?? undefined,
      official: values.official ?? undefined,
      allowGuestEnrollments: values.allowGuestEnrollments ?? undefined,
      schedulePublished: values.schedulePublished ?? undefined,
    });
  }
}
