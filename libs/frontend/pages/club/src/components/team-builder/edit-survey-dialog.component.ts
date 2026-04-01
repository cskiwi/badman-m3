import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { SurveyResponse } from '../../pages/detail/tabs/team-builder/types/survey-response';
import { TeamBuilderPlayer } from '../../pages/detail/tabs/team-builder/types/team-builder.types';

@Component({
  selector: 'app-edit-survey-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, ButtonModule, InputTextModule, TextareaModule, InputNumberModule, CheckboxModule],
  templateUrl: './edit-survey-dialog.component.html',
})
export class EditSurveyDialogComponent implements OnInit {
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);

  readonly player: TeamBuilderPlayer = this.config.data?.player;

  // Editable survey fields
  desiredTeamCount = 1;
  preferredPlayDay = '';
  team1Choice1 = '';
  team1Choice2 = '';
  team2Choice1 = '';
  team2Choice2 = '';
  canMeet75PercentTeam1 = '';
  canMeet75PercentTeam2 = '';
  unavailabilityPeriodsTeam1 = '';
  unavailabilityPeriodsTeam2 = '';
  comments = '';
  stoppingCompetition = false;

  ngOnInit() {
    const survey = this.player?.survey;
    if (survey) {
      this.desiredTeamCount = survey.desiredTeamCount ?? 1;
      this.preferredPlayDay = survey.preferredPlayDay ?? '';
      this.team1Choice1 = survey.team1Choice1 ?? '';
      this.team1Choice2 = survey.team1Choice2 ?? '';
      this.team2Choice1 = survey.team2Choice1 ?? '';
      this.team2Choice2 = survey.team2Choice2 ?? '';
      this.canMeet75PercentTeam1 = survey.canMeet75PercentTeam1 ?? '';
      this.canMeet75PercentTeam2 = survey.canMeet75PercentTeam2 ?? '';
      this.unavailabilityPeriodsTeam1 = survey.unavailabilityPeriodsTeam1 ?? '';
      this.unavailabilityPeriodsTeam2 = survey.unavailabilityPeriodsTeam2 ?? '';
      this.comments = survey.comments ?? '';
      this.stoppingCompetition = survey.stoppingCompetition ?? false;
    }
  }

  save() {
    const existing = this.player?.survey;
    const updated: SurveyResponse = {
      externalId: existing?.externalId ?? '',
      createdOn: existing?.createdOn ?? new Date().toISOString(),
      createdBy: existing?.createdBy ?? 'manual',
      fullName: this.player?.fullName ?? '',
      firstName: this.player?.firstName ?? '',
      lastName: this.player?.lastName ?? '',
      currentTeams: existing?.currentTeams ?? [],
      desiredTeamCount: this.desiredTeamCount,
      preferredPlayDay: this.preferredPlayDay,
      team1Choice1: this.team1Choice1,
      team1Choice2: this.team1Choice2,
      team2Choice1: this.team2Choice1,
      team2Choice2: this.team2Choice2,
      canMeet75PercentTeam1: this.canMeet75PercentTeam1,
      canMeet75PercentTeam2: this.canMeet75PercentTeam2,
      unavailabilityPeriodsTeam1: this.unavailabilityPeriodsTeam1,
      unavailabilityPeriodsTeam2: this.unavailabilityPeriodsTeam2,
      comments: this.comments,
      meetingAttendance: existing?.meetingAttendance ?? '',
      availableDates: existing?.availableDates ?? [],
      stoppingCompetition: this.stoppingCompetition,
      linkedContactIds: existing?.linkedContactIds ?? [],
      matchedPlayerId: existing?.matchedPlayerId ?? this.player?.id,
      matchedPlayerName: existing?.matchedPlayerName ?? this.player?.fullName,
      matchConfidence: existing?.matchConfidence ?? 'high',
    };

    this.dialogRef.close(updated);
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
