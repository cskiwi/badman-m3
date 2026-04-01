import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DEFAULT_TEAM_BUILDER_CONFIG, TeamBuilderConfig } from '../../pages/detail/tabs/team-builder/types/team-builder.types';

@Component({
  selector: 'app-team-builder-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, ButtonModule, InputNumberModule],
  templateUrl: './settings-dialog.component.html',
})
export class SettingsDialogComponent implements OnInit {
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly dialogConfig = inject(DynamicDialogConfig);

  presenceThreshold = DEFAULT_TEAM_BUILDER_CONFIG.presenceThreshold;
  performanceThreshold = DEFAULT_TEAM_BUILDER_CONFIG.performanceThreshold;
  minPlayersPerTeam = DEFAULT_TEAM_BUILDER_CONFIG.minPlayersPerTeam;
  minMalesPerMxTeam = DEFAULT_TEAM_BUILDER_CONFIG.minMalesPerMxTeam;
  minFemalesPerMxTeam = DEFAULT_TEAM_BUILDER_CONFIG.minFemalesPerMxTeam;
  maxPlayersPerTeam = DEFAULT_TEAM_BUILDER_CONFIG.maxPlayersPerTeam;

  ngOnInit() {
    const config: TeamBuilderConfig = this.dialogConfig.data?.config;
    if (config) {
      this.presenceThreshold = config.presenceThreshold;
      this.performanceThreshold = config.performanceThreshold;
      this.minPlayersPerTeam = config.minPlayersPerTeam;
      this.minMalesPerMxTeam = config.minMalesPerMxTeam;
      this.minFemalesPerMxTeam = config.minFemalesPerMxTeam;
      this.maxPlayersPerTeam = config.maxPlayersPerTeam;
    }
  }

  save() {
    const config: TeamBuilderConfig = {
      presenceThreshold: this.presenceThreshold,
      performanceThreshold: this.performanceThreshold,
      minPlayersPerTeam: this.minPlayersPerTeam,
      minMalesPerMxTeam: this.minMalesPerMxTeam,
      minFemalesPerMxTeam: this.minFemalesPerMxTeam,
      maxPlayersPerTeam: this.maxPlayersPerTeam,
    };
    this.dialogRef.close(config);
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
