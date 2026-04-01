import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDropList, CdkDrag, CdkDragDrop, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';
import { DialogService } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { SubEventTypeEnum } from '@app/models-enum';
import { ClubTeamBuilderTabService } from './club-team-builder-tab.service';
import { ImportSurveyDialogComponent } from '../../../components/team-builder/import-survey-dialog.component';
import { EditSurveyDialogComponent } from '../../../components/team-builder/edit-survey-dialog.component';
import { SubEventDialogComponent } from '../../../components/team-builder/sub-event-dialog.component';
import { BuilderTeamCardComponent } from '../../../components/team-builder/builder-team-card.component';
import { PlayerChipComponent } from '../../../components/team-builder/player-chip.component';
import { Player } from '@app/models';
import { MatchResult } from './team-builder/services/player-matcher.service';
import { TEAM_BUILDER_AUTO_SUB_EVENT, TeamBuilderPlayer, TeamBuilderTeam } from './team-builder/types/team-builder.types';
import { SurveyResponse } from './team-builder/types/survey-response';

@Component({
  selector: 'app-club-team-builder-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CdkDropList,
    CdkDrag,
    CdkDropListGroup,
    TranslateModule,
    ButtonModule,
    TagModule,
    IconField,
    InputIcon,
    InputTextModule,
    SelectModule,
    TooltipModule,
    SkeletonModule,
    MessageModule,
    ConfirmDialogModule,
    ToastModule,
    CheckboxModule,
    SelectButtonModule,
    AutoCompleteModule,
    BuilderTeamCardComponent,
    PlayerChipComponent,
  ],
  providers: [ClubTeamBuilderTabService, DialogService, ConfirmationService, MessageService],
  templateUrl: './club-team-builder-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubTeamBuilderTabComponent {
  readonly service = inject(ClubTeamBuilderTabService);
  private readonly dialogService = inject(DialogService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  clubId = input.required<string>();
  season = input.required<number>();

  searchQuery = '';
  sortBy: 'name' | 'index' = 'name';
  separateBackups = true;

  // Add player search
  playerSuggestions = signal<Player[]>([]);
  selectedPlayer: Player | null = null;

  sortOptions = [
    { label: 'Name', value: 'name' },
    { label: 'Index', value: 'index' },
  ];

  teamTypeOptions = Object.values(SubEventTypeEnum)
    .filter((v) => ['M', 'F', 'MX'].includes(v))
    .map((v) => ({ label: v, value: v }));

  constructor() {
    effect(() => {
      this.service.setClubId(this.clubId());
    });

    effect(() => {
      this.service.setSeason(this.season());
    });

    // Auto-initialize when data loads
    effect(() => {
      const teams = this.service.currentTeams();
      if (teams.length > 0 && !this.service.initialized()) {
        this.service.initializeBuilder();
      }
    });
  }

  get filteredUnassignedPlayers() {
    const players = this.service.unassignedPlayers();
    if (!this.searchQuery) return players;

    const query = this.searchQuery.toLowerCase();
    return players.filter((p) => p.fullName.toLowerCase().includes(query));
  }

  openImportDialog() {
    const ref = this.dialogService.open(ImportSurveyDialogComponent, {
      header: 'Import Player Survey',
      width: '800px',
      data: {
        systemId: this.service.systemId(),
        clubPlayers: this.service.getClubPlayers(),
        clubId: this.clubId(),
      },
    });

    ref?.onClose.subscribe(async (results: MatchResult[] | null) => {
      if (results) {
        await this.service.processImportResults(results);
        const matchedCount = results.filter((r) => r.player).length;
        const createdCount = results.filter((r) => !r.player && r.createNew).length;
        this.messageService.add({
          severity: 'success',
          summary: 'Survey imported',
          detail: `${matchedCount} matched, ${createdCount} new players created`,
        });
      }
    });
  }

  openEditSurveyDialog(player: TeamBuilderPlayer) {
    const ref = this.dialogService.open(EditSurveyDialogComponent, {
      header: `Edit Survey — ${player.fullName}`,
      width: '600px',
      data: { player },
    });

    ref?.onClose.subscribe((updatedSurvey: SurveyResponse | null) => {
      if (updatedSurvey) {
        this.service.updatePlayerSurvey(player.id, updatedSurvey);
        this.messageService.add({
          severity: 'success',
          summary: 'Survey updated',
          detail: `Survey data updated for ${player.fullName}`,
        });
      }
    });
  }

  addTeam(type: 'M' | 'F' | 'MX') {
    this.service.addTeam(type);
  }

  onPlayerDroppedOnTeam(event: CdkDragDrop<string>) {
    const data = event.item.data as { playerId: string; fromTeamId: string | null };
    const toTeamId = event.container.data;
    if (data.fromTeamId !== toTeamId) {
      this.service.movePlayer(data.playerId, data.fromTeamId, toTeamId);
    }
  }

  onPlayerDroppedOnPool(event: CdkDragDrop<string>) {
    const data = event.item.data as { playerId: string; fromTeamId: string | null };
    if (data.fromTeamId) {
      this.service.movePlayer(data.playerId, data.fromTeamId, null);
    }
  }

  onPlayerDroppedOnStopping(event: CdkDragDrop<string>) {
    const data = event.item.data as { playerId: string; fromTeamId: string | null };
    if (data.fromTeamId !== 'stopping') {
      this.service.movePlayer(data.playerId, data.fromTeamId, 'stopping');
    }
  }

  onMembershipToggled(teamId: string, event: { playerId: string; type: 'REGULAR' | 'BACKUP' }) {
    this.service.setMembershipType(event.playerId, teamId, event.type);
  }

  onSubEventChanged(teamId: string, selection: string) {
    this.service.setTeamSubEvent(teamId, selection);
  }

  openSubEventDialog(team: TeamBuilderTeam) {
    const options = this.service.getSubEventOptions(team.type);
    const allSubEvents = this.service.getAllSubEvents(team.type);
    const currentValue = team.subEventManuallyOverridden
      ? (team.selectedSubEvent?.id ?? TEAM_BUILDER_AUTO_SUB_EVENT)
      : TEAM_BUILDER_AUTO_SUB_EVENT;

    const ref = this.dialogService.open(SubEventDialogComponent, {
      header: `Sub-event — ${team.name}`,
      width: '500px',
      data: {
        currentSubEvent: team.originalSubEvent,
        options,
        allSubEvents,
        selectedValue: currentValue,
      },
    });

    ref?.onClose.subscribe((selection: string | null) => {
      if (selection != null) {
        this.service.setTeamSubEvent(team.id, selection);
      }
    });
  }

  removeTeam(teamId: string) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to remove this team? Players will be moved to the unassigned pool.',
      header: 'Remove Team',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.service.removeTeam(teamId),
    });
  }

  markTeamForRemoval(teamId: string) {
    this.service.markTeamForRemoval(teamId);
  }

  async save() {
    const saveSummary = this.service.getSaveSummary();
    const validation = this.service.validationSummary();

    let message =
      `Save ${saveSummary.teamsUpdated} updated and ${saveSummary.teamsCreated} new team(s) ` +
      `with ${saveSummary.totalPlayers} players for season ${this.service.nextSeason()}?`;

    if (saveSummary.teamsRemoved > 0) {
      message += `\n\n${saveSummary.teamsRemoved} team(s) will be removed.`;
    }

    if (validation.invalid > 0) {
      message += `\n\n⚠ ${validation.invalid} team(s) have validation warnings:\n` + validation.errors.map((e) => `• ${e}`).join('\n');
    }

    this.confirmationService.confirm({
      message,
      header: 'Save Teams',
      icon: validation.invalid > 0 ? 'pi pi-exclamation-triangle' : 'pi pi-save',
      accept: () => this.doSave(),
    });
  }

  onPlayerDroppedOnRemove(event: CdkDragDrop<string>) {
    const data = event.item.data as { playerId: string; fromTeamId: string | null };
    this.service.removePlayer(data.playerId, data.fromTeamId);
  }

  restorePlayer(playerId: string) {
    this.service.restorePlayer(playerId);
  }

  async searchPlayerToAdd(event: { query: string }) {
    const results = await this.service.searchPlayers(event.query);
    this.playerSuggestions.set(results);
  }

  async onPlayerSelected(event: { value: Player }) {
    const player = event.value;
    if (!player) return;

    const added = await this.service.addExternalPlayer(player);
    if (added) {
      this.messageService.add({
        severity: 'success',
        summary: 'Player added',
        detail: `${player.fullName} added to pool`,
      });
    } else {
      this.messageService.add({
        severity: 'info',
        summary: 'Already present',
        detail: `${player.fullName} is already in the builder`,
      });
    }
    this.selectedPlayer = null;
  }

  private async doSave() {
    const success = await this.service.save();
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'Saved',
        detail: `Teams saved for season ${this.service.nextSeason()}`,
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save teams',
      });
    }
  }
}
