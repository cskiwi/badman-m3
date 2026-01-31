import { Component, computed, inject, signal, effect, input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';

import { lastValueFrom } from 'rxjs';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';

import { CompetitionEvent } from '@app/models';
import { MessageService } from 'primeng/api';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@app/frontend-modules-auth/service';

const UPDATE_COMPETITION_SETTINGS = gql`
  mutation UpdateCompetitionEvent($id: ID!, $input: CompetitionEventUpdateInput!) {
    updateCompetitionEvent(id: $id, input: $input) {
      id
      official
      teamMatcher
      checkEncounterForFilledIn
      usedRankingAmount
      usedRankingUnit
    }
  }
`;

@Component({
  selector: 'app-competition-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    InputNumberModule,
    CheckboxModule,
    MessageModule,
    ProgressBarModule,
    TranslateModule,
  ],
  templateUrl: './competition-settings.component.html',
})
export class CompetitionSettingsComponent {
  private readonly apollo = inject(Apollo);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);

  // Inputs
  readonly competition = input<CompetitionEvent | null>(null);

  // Loading and error states
  readonly savingSettings = signal(false);
  readonly error = signal<string | null>(null);

  readonly saving = computed(() => this.savingSettings());

  // Form setup
  readonly settingsForm: FormGroup;

  // Ranking unit options
  readonly rankingUnitOptions = [
    { label: 'Months', value: 'months' },
    { label: 'Weeks', value: 'weeks' },
    { label: 'Days', value: 'days' },
  ];

  constructor() {
    this.settingsForm = this.fb.group({
      official: [false],
      teamMatcher: [''],
      checkEncounterForFilledIn: [false],
      usedRankingAmount: [4],
      usedRankingUnit: ['months'],
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
        this.settingsForm.disable();
      } else {
        this.settingsForm.enable();
      }
    });
  }

  private updateFormValues(competition: CompetitionEvent): void {
    this.settingsForm.patchValue({
      official: competition.official || false,
      teamMatcher: competition.teamMatcher || '',
      checkEncounterForFilledIn: competition.checkEncounterForFilledIn || false,
      usedRankingAmount: competition.usedRankingAmount || 4,
      usedRankingUnit: competition.usedRankingUnit || 'months',
    });

    // Mark form as pristine after loading data
    this.settingsForm.markAsPristine();
  }

  canEditCompetition(): boolean {
    const competition = this.competition();
    return this.authService.hasAnyPermission([
      'edit-any:competition',
      `${competition?.id}_edit:competition`,
    ]);
  }

  async saveSettings(): Promise<void> {
    const competition = this.competition();
    if (!competition?.id) {
      this.error.set('No competition selected');
      return;
    }

    this.savingSettings.set(true);
    this.error.set(null);

    try {
      const formValue = this.settingsForm.value;

      await lastValueFrom(
        this.apollo.mutate({
          mutation: UPDATE_COMPETITION_SETTINGS,
          variables: {
            id: competition.id,
            input: {
              official: formValue.official,
              teamMatcher: formValue.teamMatcher,
              checkEncounterForFilledIn: formValue.checkEncounterForFilledIn,
              usedRankingAmount: formValue.usedRankingAmount,
              usedRankingUnit: formValue.usedRankingUnit,
            },
          },
        }),
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Competition settings updated successfully',
      });

      this.settingsForm.markAsPristine();
      return Promise.resolve();
    } catch (err) {
      this.error.set('Failed to update competition settings. Please try again.');
      return Promise.reject(err);
    } finally {
      this.savingSettings.set(false);
    }
  }

  get isDirty(): boolean {
    return this.settingsForm.dirty;
  }

  get isValid(): boolean {
    return this.settingsForm.valid;
  }
}
