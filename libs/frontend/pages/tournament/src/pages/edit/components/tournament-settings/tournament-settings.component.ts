import { Component, computed, inject, signal, effect, input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';

import { lastValueFrom } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';

import { TournamentEvent } from '@app/models';
import { MessageService } from 'primeng/api';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@app/frontend-modules-auth/service';

const UPDATE_TOURNAMENT_SETTINGS = gql`
  mutation UpdateTournamentEvent($id: ID!, $data: TournamentEventUpdateInput!) {
    updateTournamentEvent(id: $id, data: $data) {
      id
      official
      allowGuestEnrollments
      schedulePublished
    }
  }
`;

@Component({
  selector: 'app-tournament-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    MessageModule,
    ProgressBarModule,
    TranslateModule,
  ],
  templateUrl: './tournament-settings.component.html',
})
export class TournamentSettingsComponent {
  private readonly apollo = inject(Apollo);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);

  readonly tournament = input<TournamentEvent | null>(null);

  readonly savingSettings = signal(false);
  readonly error = signal<string | null>(null);
  readonly saving = computed(() => this.savingSettings());

  readonly settingsForm: FormGroup;

  constructor() {
    this.settingsForm = this.fb.group({
      official: [false],
      allowGuestEnrollments: [false],
      schedulePublished: [false],
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
        this.settingsForm.disable();
      } else {
        this.settingsForm.enable();
      }
    });
  }

  private updateFormValues(tournament: TournamentEvent): void {
    this.settingsForm.patchValue({
      official: tournament.official || false,
      allowGuestEnrollments: tournament.allowGuestEnrollments || false,
      schedulePublished: tournament.schedulePublished || false,
    });
    this.settingsForm.markAsPristine();
  }

  canEditTournament(): boolean {
    const tournament = this.tournament();
    return this.authService.hasAnyPermission([
      'edit-any:tournament',
      `${tournament?.id}_edit:tournament`,
    ]);
  }

  async saveSettings(): Promise<void> {
    const tournament = this.tournament();
    if (!tournament?.id) {
      this.error.set('No tournament selected');
      return;
    }

    this.savingSettings.set(true);
    this.error.set(null);

    try {
      const formValue = this.settingsForm.value;

      await lastValueFrom(
        this.apollo.mutate({
          mutation: UPDATE_TOURNAMENT_SETTINGS,
          variables: {
            id: tournament.id,
            data: {
              official: formValue.official,
              allowGuestEnrollments: formValue.allowGuestEnrollments,
              schedulePublished: formValue.schedulePublished,
            },
          },
        }),
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Tournament settings updated successfully',
      });

      this.settingsForm.markAsPristine();
      return Promise.resolve();
    } catch (err) {
      this.error.set('Failed to update tournament settings. Please try again.');
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
