import { Component, computed, inject, signal, effect, input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { CommonModule } from '@angular/common';
import { lastValueFrom } from 'rxjs';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';

import { Player } from '@app/models';
import { MessageService } from 'primeng/api';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@app/frontend-modules-auth/service';

// Note: This mutation doesn't exist yet - it would need to be implemented in the backend
const UPDATE_PLAYER_PROFILE = gql`
  mutation UpdatePlayerProfile($playerId: ID!, $input: UpdatePlayerProfileInput!) {
    updatePlayerProfile(playerId: $playerId, input: $input) {
      id
      firstName
      lastName
      email
      phone
      gender
      birthDate
      competitionPlayer
    }
  }
`;

@Component({
  selector: 'app-player-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    CheckboxModule,
    MessageModule,
    ProgressBarModule,
    TranslateModule,
  ],
  templateUrl: './player-profile.component.html',
})
export class PlayerProfileComponent {
  private readonly apollo = inject(Apollo);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);

  // Inputs
  readonly player = input<Player | null>(null);

  // Loading and error states
  readonly savingProfile = signal(false);
  readonly error = signal<string | null>(null);

  readonly saving = computed(() => this.savingProfile());

  // Form setup
  readonly profileForm: FormGroup;
  
  // Gender options
  readonly genderOptions = [
    { label: 'Male', value: 'M' },
    { label: 'Female', value: 'F' }
  ];

  readonly maxBirthDate = new Date(); // Today

  constructor() {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.email]],
      phone: [''],
      gender: [null],
      birthDate: [null],
      competitionPlayer: [false],
      sub: [''],
      memberId: ['']
    });

    // Update form values when player data changes
    effect(() => {
      const player = this.player();
      if (player) {
        this.updateFormValues(player);
      }
    });

    // Handle form control disabled state based on permissions
    effect(() => {
      const canEditAdmin = this.canEditAdminFields();
      const canEditContact = this.canEditContactFields();

      // Admin fields
      const adminControls = ['firstName', 'lastName', 'gender', 'birthDate', 'competitionPlayer'];
      adminControls.forEach(controlName => {
        const control = this.profileForm.get(controlName);
        if (control) {
          if (canEditAdmin) {
            control.enable();
          } else {
            control.disable();
          }
        }
      });

      // Contact fields
      const contactControls = ['email', 'phone'];
      contactControls.forEach(controlName => {
        const control = this.profileForm.get(controlName);
        if (control) {
          if (canEditContact) {
            control.enable();
          } else {
            control.disable();
          }
        }
      });
    });
  }

  private updateFormValues(player: Player): void {
    this.profileForm.patchValue({
      firstName: player.firstName || '',
      lastName: player.lastName || '',
      email: player.email || '',
      phone: player.phone || '',
      gender: player.gender || null,
      birthDate: player.birthDate ? new Date(player.birthDate) : null,
      competitionPlayer: player.competitionPlayer || false,
      sub: player.sub || '',
      memberId: player.memberId || ''
    });

    // Mark form as pristine after loading data
    this.profileForm.markAsPristine();
  }
  /**
   * Whether the current user can view admin-only fields (sub, memberId)
   */
  get canViewAdminFields(): boolean {
    return this.canEditAdminFields();
  }

  canEditContactFields(): boolean {
    const player = this.player();
    const currentUser = this.authService.user();
    // User can edit their own contact fields
    if (currentUser && player && currentUser.id === player.id) {
      return true;
    }
    // Use AuthService for permission check
    return this.authService.hasAnyPermission([
      'edit-any:player',
      `${player?.id}_edit:player`
    ]);
  }

  canEditAdminFields(): boolean {
    const player = this.player();
    // Use AuthService for permission check
    return this.authService.hasAnyPermission([
      'edit-any:player',
      `${player?.id}_edit:player`
    ]);
  }

  async saveProfile(): Promise<void> {
    const player = this.player();
    if (!player?.id) {
      this.error.set('No player selected');
      return;
    }

    if (!this.profileForm.valid) {
      this.profileForm.markAllAsTouched();
      this.error.set('Please fix validation errors');
      return;
    }

    this.savingProfile.set(true);
    this.error.set(null);

    try {
      const formValue = this.profileForm.value;
      
      // Note: This mutation would need to be implemented in the backend
      await lastValueFrom(
        this.apollo.mutate({
          mutation: UPDATE_PLAYER_PROFILE,
          variables: {
            playerId: player.id,
            input: {
              firstName: formValue.firstName,
              lastName: formValue.lastName,
              email: formValue.email,
              phone: formValue.phone,
              gender: formValue.gender,
              birthDate: formValue.birthDate,
              competitionPlayer: formValue.competitionPlayer
            }
          }
        }),
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Player profile updated successfully',
      });

      this.profileForm.markAsPristine();
      return Promise.resolve();
    } catch (err) {
      this.error.set('Failed to update player profile. This feature may not be implemented yet.');
      return Promise.reject(err);
    } finally {
      this.savingProfile.set(false);
    }
  }

  get isDirty(): boolean {
    return this.profileForm.dirty;
  }

  get isValid(): boolean {
    return this.profileForm.valid;
  }
}