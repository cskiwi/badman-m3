import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { debounceTime, distinctUntilChanged, lastValueFrom, switchMap } from 'rxjs';

import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { AuthService } from '@app/frontend-modules-auth/service';
import { Player, Team, TeamPlayerMembership } from '@app/models';
import { SubEventTypeEnum } from '@app/model/enums';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Component, computed, inject, signal } from '@angular/core';

const UPDATE_TEAM = gql`
  mutation UpdateTeam($teamId: ID!, $input: UpdateTeamInput!) {
    updateTeam(teamId: $teamId, input: $input) {
      id
      name
      abbreviation
      email
      phone
      captainId
      preferredTime
      preferredDay
      type
    }
  }
`;

@Component({
  selector: 'app-team-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    // PrimeNG Modules
    AutoCompleteModule,
    ButtonModule,
    CheckboxModule,
    ChipModule,
    DatePickerModule,
    DialogModule,
    InputTextModule,
    MultiSelectModule,
    SelectModule,
    TableModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './team-edit.component.html',
})
export class TeamEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly apollo = inject(Apollo);
  private readonly http = inject(HttpClient);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);
  private readonly translateService = inject(TranslateService);
  private readonly dialogService = inject(DialogService);

  saving = computed(() => this._saving());
  private _saving = signal(false);

  teamForm: FormGroup;

  // Options for select inputs
  seasonOptions = Array.from({ length: 10 }, (_, i) => ({
    value: new Date().getFullYear() - 5 + i,
    label: `${new Date().getFullYear() - 5 + i}/${new Date().getFullYear() - 4 + i}`,
  }));

  dayOptions = [
    { value: 'monday', label: this.translateService.instant('all.days.monday') },
    { value: 'tuesday', label: this.translateService.instant('all.days.tuesday') },
    { value: 'wednesday', label: this.translateService.instant('all.days.wednesday') },
    { value: 'thursday', label: this.translateService.instant('all.days.thursday') },
    { value: 'friday', label: this.translateService.instant('all.days.friday') },
    { value: 'saturday', label: this.translateService.instant('all.days.saturday') },
    { value: 'sunday', label: this.translateService.instant('all.days.sunday') },
  ];

  typeOptions = Object.values(SubEventTypeEnum).map((value) => ({
    value,
    label: this.translateService.instant(`all.team.type.${value.toLowerCase()}`),
  }));

  captainSuggestions = signal<Player[]>([]);
  selectedCaptain = signal<Player | null>(null);
  teamPlayerMemberships = signal<TeamPlayerMembership[]>([]);

  constructor() {
    const team = this.config.data?.team as Team;

    // Initialize form
    this.teamForm = this.fb.group({
      name: ['', [Validators.required]],
      abbreviation: [''],
      season: [new Date().getFullYear()],
      teamNumber: [''],
      email: ['', [Validators.email]],
      phone: [''],
      preferredTime: [null],
      preferredDay: [null],
      type: [null],
      captain: [null],
    });

    // Load team data if editing
    if (team) {
      this.updateFormValues(team);
      if (team.teamPlayerMemberships) {
        this.teamPlayerMemberships.set(team.teamPlayerMemberships);
      }
      // Load current captain if exists
      if (team.captain) {
        this.selectedCaptain.set(team.captain);
      }
    }
  }

  searchCaptain(event: { query: string }): void {
    if (event.query.length < 2) {
      this.captainSuggestions.set([]);
      return;
    }

    this.http.get<Array<{ hit: Player; score: number }>>(`/api/v1/search?types=players&query=${encodeURIComponent(event.query)}`)
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe({
        next: (result) => {
          // Extract player data from hit objects
          const players = result.map(item => item.hit);
          this.captainSuggestions.set(players);
        },
        error: (err) => {
          console.error('Failed to search players:', err);
          this.captainSuggestions.set([]);
        }
      });
  }

  onCaptainSelect(event: any): void {
    const player = event.value || event;
    this.selectedCaptain.set(player);
    this.teamForm.markAsDirty();
  }

  onCaptainClear(): void {
    this.selectedCaptain.set(null);
    this.teamForm.markAsDirty();
  }

  displayCaptain = computed(() => {
    const captain = this.selectedCaptain();
    return captain?.fullName || '';
  });

  onCaptainInputChange(value: string): void {
    // Only clear the selected captain if the input is cleared
    if (!value) {
      this.selectedCaptain.set(null);
      this.teamForm.markAsDirty();
    }
  }

  private updateFormValues(team: Team): void {
    // Convert time string (HH:MM:SS) to Date object for time picker
    let preferredTimeDate = null;
    if (team.preferredTime) {
      const today = new Date();
      const [hours, minutes] = team.preferredTime.split(':').map(Number);
      preferredTimeDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
    }
    
    this.teamForm.patchValue({
      name: team.name || '',
      abbreviation: team.abbreviation || '',
      season: team.season || new Date().getFullYear(),
      teamNumber: team.teamNumber || '',
      email: team.email || '',
      phone: team.phone || '',
      preferredTime: preferredTimeDate,
      preferredDay: team.preferredDay || null,
      type: team.type || null,
      captain: team.captain || null,
    });
    this.teamForm.markAsPristine();
  }

  showAddMemberDialog(): void {
    // TODO: Implement add member dialog
  }

  removeMembership(membership: TeamPlayerMembership): void {
    this.teamPlayerMemberships.update((members) => members.filter((m) => m.id !== membership.id));
    this.teamForm.markAsDirty();
  }

  async onSave(): Promise<void> {
    if (!this.teamForm.valid) {
      this.teamForm.markAllAsTouched();
      return;
    }

    this._saving.set(true);

    try {
      const formValue = this.teamForm.value;
      const team = this.config.data?.team as Team;
      const captain = this.selectedCaptain();

      // Convert Date object back to time string (HH:MM:SS)
      let preferredTimeString = null;
      if (formValue.preferredTime) {
        const date = new Date(formValue.preferredTime);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        preferredTimeString = `${hours}:${minutes}:00`;
      }

      const result = await lastValueFrom(
        this.apollo.mutate<{ updateTeam: Team }>({
          mutation: UPDATE_TEAM,
          variables: {
            teamId: team.id,
            input: {
              name: formValue.name,
              abbreviation: formValue.abbreviation,
              email: formValue.email,
              phone: formValue.phone,
              captainId: captain?.id || null,
              preferredTime: preferredTimeString,
              preferredDay: formValue.preferredDay,
              type: formValue.type,
            },
          },
        }),
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Team updated successfully',
      });

      this.dialogRef.close(result.data?.updateTeam);
    } catch (err) {
      console.error('Failed to update team:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update team',
      });
    } finally {
      this._saving.set(false);
    }
  }

  onHide(): void {
    this.dialogRef.close();
  }

  canEdit(): boolean {
    const team = this.config.data?.team as Team;
    return team ? this.authService.hasAnyPermission(['edit-any:club', `${team.id}_edit:team`]) : false;
  }
}
