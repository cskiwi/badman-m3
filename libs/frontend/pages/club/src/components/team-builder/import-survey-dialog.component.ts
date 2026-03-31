import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ProgressBarModule } from 'primeng/progressbar';
import { FileUploadModule } from 'primeng/fileupload';
import { ExcelParserService } from '../../pages/detail/tabs/team-builder/services/excel-parser.service';
import { MatchResult, PlayerMatcherService, MatchedPlayer } from '../../pages/detail/tabs/team-builder/services/player-matcher.service';
import { SurveyResponse } from '../../pages/detail/tabs/team-builder/types/survey-response';

@Component({
  selector: 'app-import-survey-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    TableModule,
    TagModule,
    AutoCompleteModule,
    ProgressBarModule,
    FileUploadModule,
  ],
  providers: [ExcelParserService, PlayerMatcherService],
  templateUrl: './import-survey-dialog.component.html',
})
export class ImportSurveyDialogComponent {
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);
  private readonly excelParser = inject(ExcelParserService);
  private readonly playerMatcher = inject(PlayerMatcherService);

  readonly systemId: string = this.config.data?.systemId ?? '';
  readonly clubPlayers: MatchedPlayer[] = this.config.data?.clubPlayers ?? [];

  step = signal<'upload' | 'matching' | 'review'>('upload');
  loading = signal(false);
  matchResults = signal<MatchResult[]>([]);
  playerSuggestions = signal<MatchedPlayer[]>([]);

  async onFileSelected(event: { files: File[] }) {
    const file = event.files?.[0];
    if (!file) return;

    this.loading.set(true);
    this.step.set('matching');

    try {
      const responses = await this.excelParser.parseFile(file);
      const results = await this.playerMatcher.matchPlayers(responses, this.systemId, this.clubPlayers);
      this.matchResults.set(results);
      this.step.set('review');
    } catch (err) {
      console.error('Failed to parse/match survey', err);
      this.step.set('upload');
    } finally {
      this.loading.set(false);
    }
  }

  async searchPlayer(event: { query: string }) {
    const results = await this.playerMatcher.searchPlayerByName(event.query, this.clubPlayers);
    this.playerSuggestions.set(results);
  }

  onPlayerSelected(result: MatchResult, player: MatchedPlayer) {
    result.player = player;
    result.confidence = 'high';
    result.editing = false;
    result.survey.matchedPlayerId = player.id;
    result.survey.matchedPlayerName = player.fullName;
    result.survey.matchConfidence = 'high';
    // Trigger reactivity
    this.matchResults.set([...this.matchResults()]);
  }

  getConfidenceSeverity(confidence: string): 'success' | 'warn' | 'danger' | 'info' {
    switch (confidence) {
      case 'high': return 'success';
      case 'medium': return 'warn';
      case 'low': return 'danger';
      default: return 'info';
    }
  }

  get matchedCount(): number {
    return this.matchResults().filter((r) => r.player).length;
  }

  get totalCount(): number {
    return this.matchResults().length;
  }

  confirm() {
    const surveys = this.matchResults()
      .filter((r) => r.player)
      .map((r) => r.survey);
    this.dialogRef.close(surveys);
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
