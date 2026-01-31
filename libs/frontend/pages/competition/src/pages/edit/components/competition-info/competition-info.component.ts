import { Component, computed, inject, signal, effect, input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';

import { lastValueFrom } from 'rxjs';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';

import { CompetitionEvent } from '@app/models';
import { LevelType } from '@app/models-enum';
import { MessageService } from 'primeng/api';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@app/frontend-modules-auth/service';
import { CountrySelectComponent, StateSelectComponent } from '@app/frontend-components/country-state';

const UPDATE_COMPETITION_INFO = gql`
  mutation UpdateCompetitionEvent($id: ID!, $input: CompetitionEventUpdateInput!) {
    updateCompetitionEvent(id: $id, input: $input) {
      id
      name
      season
      type
      state
      country
      contactEmail
    }
  }
`;

@Component({
  selector: 'app-competition-info',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    InputNumberModule,
    MessageModule,
    ProgressBarModule,
    TranslateModule,
    CountrySelectComponent,
    StateSelectComponent,
  ],
  templateUrl: './competition-info.component.html',
})
export class CompetitionInfoComponent {
  private readonly apollo = inject(Apollo);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);

  // Inputs
  readonly competition = input<CompetitionEvent | null>(null);

  // Loading and error states
  readonly savingInfo = signal(false);
  readonly error = signal<string | null>(null);

  readonly saving = computed(() => this.savingInfo());

  // Form setup
  readonly infoForm: FormGroup;

  // Track the selected country for state filtering
  readonly selectedCountry = signal<string | null>(null);

  // Type options
  readonly typeOptions = [
    { label: 'Provincial', value: LevelType.PROV },
    { label: 'Liga', value: LevelType.LIGA },
    { label: 'National', value: LevelType.NATIONAL },
  ];

  constructor() {
    this.infoForm = this.fb.group({
      name: ['', [Validators.required]],
      season: [null, [Validators.required, Validators.min(2000), Validators.max(2100)]],
      type: [null],
      state: [null],
      country: [null],
      contactEmail: ['', [Validators.email]],
    });

    // Track country changes for state filtering
    this.infoForm.get('country')!.valueChanges.subscribe((value) => {
      this.selectedCountry.set(value);
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

      // Disable all fields if user cannot edit
      if (!canEdit) {
        this.infoForm.disable();
      } else {
        this.infoForm.enable();
      }
    });
  }

  private updateFormValues(competition: CompetitionEvent): void {
    this.infoForm.patchValue({
      name: competition.name || '',
      season: competition.season || null,
      type: competition.type || null,
      state: competition.state || null,
      country: competition.country || null,
      contactEmail: competition.contactEmail || '',
    });
    this.selectedCountry.set(competition.country || null);

    // Mark form as pristine after loading data
    this.infoForm.markAsPristine();
  }

  canEditCompetition(): boolean {
    const competition = this.competition();
    return this.authService.hasAnyPermission([
      'edit-any:competition',
      `${competition?.id}_edit:competition`,
    ]);
  }

  async saveInfo(): Promise<void> {
    const competition = this.competition();
    if (!competition?.id) {
      this.error.set('No competition selected');
      return;
    }

    if (!this.infoForm.valid) {
      this.infoForm.markAllAsTouched();
      this.error.set('Please fix validation errors');
      return;
    }

    this.savingInfo.set(true);
    this.error.set(null);

    try {
      const formValue = this.infoForm.value;

      await lastValueFrom(
        this.apollo.mutate({
          mutation: UPDATE_COMPETITION_INFO,
          variables: {
            id: competition.id,
            input: {
              name: formValue.name,
              season: formValue.season,
              type: formValue.type,
              state: formValue.state,
              country: formValue.country,
              contactEmail: formValue.contactEmail,
            },
          },
        }),
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Competition info updated successfully',
      });

      this.infoForm.markAsPristine();
      return Promise.resolve();
    } catch (err) {
      this.error.set('Failed to update competition info. Please try again.');
      return Promise.reject(err);
    } finally {
      this.savingInfo.set(false);
    }
  }

  get isDirty(): boolean {
    return this.infoForm.dirty;
  }

  get isValid(): boolean {
    return this.infoForm.valid;
  }
}
