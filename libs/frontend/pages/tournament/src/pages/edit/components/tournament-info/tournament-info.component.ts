import { Component, computed, inject, signal, effect, input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';

import { lastValueFrom } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';

import { TournamentEvent } from '@app/models';
import { MessageService } from 'primeng/api';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@app/frontend-modules-auth/service';

const UPDATE_TOURNAMENT_INFO = gql`
  mutation UpdateTournamentEvent($id: ID!, $data: TournamentEventUpdateInput!) {
    updateTournamentEvent(id: $id, data: $data) {
      id
      name
      firstDay
      openDate
      closeDate
      enrollmentOpenDate
      enrollmentCloseDate
    }
  }
`;

@Component({
  selector: 'app-tournament-info',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    DatePickerModule,
    MessageModule,
    ProgressBarModule,
    TranslateModule,
  ],
  templateUrl: './tournament-info.component.html',
})
export class TournamentInfoComponent {
  private readonly apollo = inject(Apollo);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);

  readonly tournament = input<TournamentEvent | null>(null);

  readonly savingInfo = signal(false);
  readonly error = signal<string | null>(null);
  readonly saving = computed(() => this.savingInfo());

  readonly infoForm: FormGroup;

  constructor() {
    this.infoForm = this.fb.group({
      name: ['', [Validators.required]],
      firstDay: [null],
      openDate: [null],
      closeDate: [null],
      enrollmentOpenDate: [null],
      enrollmentCloseDate: [null],
    });

    effect(() => {
      const tournament = this.tournament();
      if (tournament) {
        this.updateFormValues(tournament);
      }
    });

    effect(() => {
      const canEdit = this.canEditTournament();
      if (!canEdit) {
        this.infoForm.disable();
      } else {
        this.infoForm.enable();
      }
    });
  }

  private updateFormValues(tournament: TournamentEvent): void {
    this.infoForm.patchValue({
      name: tournament.name || '',
      firstDay: tournament.firstDay ? new Date(tournament.firstDay) : null,
      openDate: tournament.openDate ? new Date(tournament.openDate) : null,
      closeDate: tournament.closeDate ? new Date(tournament.closeDate) : null,
      enrollmentOpenDate: tournament.enrollmentOpenDate ? new Date(tournament.enrollmentOpenDate) : null,
      enrollmentCloseDate: tournament.enrollmentCloseDate ? new Date(tournament.enrollmentCloseDate) : null,
    });
    this.infoForm.markAsPristine();
  }

  canEditTournament(): boolean {
    const tournament = this.tournament();
    return this.authService.hasAnyPermission([
      'edit-any:tournament',
      `${tournament?.id}_edit:tournament`,
    ]);
  }

  async saveInfo(): Promise<void> {
    const tournament = this.tournament();
    if (!tournament?.id) {
      this.error.set('No tournament selected');
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
          mutation: UPDATE_TOURNAMENT_INFO,
          variables: {
            id: tournament.id,
            data: {
              name: formValue.name,
              firstDay: formValue.firstDay,
              openDate: formValue.openDate,
              closeDate: formValue.closeDate,
              enrollmentOpenDate: formValue.enrollmentOpenDate,
              enrollmentCloseDate: formValue.enrollmentCloseDate,
            },
          },
        }),
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Tournament info updated successfully',
      });

      this.infoForm.markAsPristine();
      return Promise.resolve();
    } catch (err) {
      this.error.set('Failed to update tournament info. Please try again.');
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
