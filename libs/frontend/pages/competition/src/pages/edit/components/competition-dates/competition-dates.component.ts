import { Component, computed, inject, signal, effect, input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';

import { lastValueFrom } from 'rxjs';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';

import { CompetitionEvent } from '@app/models';
import { MessageService } from 'primeng/api';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@app/frontend-modules-auth/service';

const UPDATE_COMPETITION_DATES = gql`
  mutation UpdateCompetitionEvent($id: ID!, $input: CompetitionEventUpdateInput!) {
    updateCompetitionEvent(id: $id, input: $input) {
      id
      openDate
      closeDate
      changeOpenDate
      changeCloseDatePeriod1
      changeCloseRequestDatePeriod1
      changeCloseDatePeriod2
      changeCloseRequestDatePeriod2
    }
  }
`;

@Component({
  selector: 'app-competition-dates',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    DatePickerModule,
    MessageModule,
    ProgressBarModule,
    TranslateModule,
  ],
  templateUrl: './competition-dates.component.html',
})
export class CompetitionDatesComponent {
  private readonly apollo = inject(Apollo);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);

  // Inputs
  readonly competition = input<CompetitionEvent | null>(null);

  // Loading and error states
  readonly savingDates = signal(false);
  readonly error = signal<string | null>(null);

  readonly saving = computed(() => this.savingDates());

  // Form setup
  readonly datesForm: FormGroup;

  constructor() {
    this.datesForm = this.fb.group({
      openDate: [null],
      closeDate: [null],
      changeOpenDate: [null],
      changeCloseDatePeriod1: [null],
      changeCloseRequestDatePeriod1: [null],
      changeCloseDatePeriod2: [null],
      changeCloseRequestDatePeriod2: [null],
    });

    // Update form values when competition data changes
    effect(() => {
      const competition = this.competition();
      if (competition) {
        this.updateFormValues(competition);
      }
    });

    // Handle form control disabled state based on permissions
    effect(() => {
      const canEdit = this.canEditCompetition();

      if (!canEdit) {
        this.datesForm.disable();
      } else {
        this.datesForm.enable();
      }
    });
  }

  private updateFormValues(competition: CompetitionEvent): void {
    this.datesForm.patchValue({
      openDate: competition.openDate ? new Date(competition.openDate) : null,
      closeDate: competition.closeDate ? new Date(competition.closeDate) : null,
      changeOpenDate: competition.changeOpenDate ? new Date(competition.changeOpenDate) : null,
      changeCloseDatePeriod1: competition.changeCloseDatePeriod1
        ? new Date(competition.changeCloseDatePeriod1)
        : null,
      changeCloseRequestDatePeriod1: competition.changeCloseRequestDatePeriod1
        ? new Date(competition.changeCloseRequestDatePeriod1)
        : null,
      changeCloseDatePeriod2: competition.changeCloseDatePeriod2
        ? new Date(competition.changeCloseDatePeriod2)
        : null,
      changeCloseRequestDatePeriod2: competition.changeCloseRequestDatePeriod2
        ? new Date(competition.changeCloseRequestDatePeriod2)
        : null,
    });

    // Mark form as pristine after loading data
    this.datesForm.markAsPristine();
  }

  canEditCompetition(): boolean {
    const competition = this.competition();
    return this.authService.hasAnyPermission([
      'edit-any:competition',
      `${competition?.id}_edit:competition`,
    ]);
  }

  async saveDates(): Promise<void> {
    const competition = this.competition();
    if (!competition?.id) {
      this.error.set('No competition selected');
      return;
    }

    this.savingDates.set(true);
    this.error.set(null);

    try {
      const formValue = this.datesForm.value;

      await lastValueFrom(
        this.apollo.mutate({
          mutation: UPDATE_COMPETITION_DATES,
          variables: {
            id: competition.id,
            input: {
              openDate: formValue.openDate,
              closeDate: formValue.closeDate,
              changeOpenDate: formValue.changeOpenDate,
              changeCloseDatePeriod1: formValue.changeCloseDatePeriod1,
              changeCloseRequestDatePeriod1: formValue.changeCloseRequestDatePeriod1,
              changeCloseDatePeriod2: formValue.changeCloseDatePeriod2,
              changeCloseRequestDatePeriod2: formValue.changeCloseRequestDatePeriod2,
            },
          },
        }),
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Competition dates updated successfully',
      });

      this.datesForm.markAsPristine();
      return Promise.resolve();
    } catch (err) {
      this.error.set('Failed to update competition dates. Please try again.');
      return Promise.reject(err);
    } finally {
      this.savingDates.set(false);
    }
  }

  get isDirty(): boolean {
    return this.datesForm.dirty;
  }

  get isValid(): boolean {
    return this.datesForm.valid;
  }
}
