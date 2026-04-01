import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDropList, CdkDrag, CdkDragDrop } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBar } from 'primeng/progressbar';
import {
  TeamBuilderPlayer,
  TeamBuilderTeam,
} from '../../pages/detail/tabs/team-builder/types/team-builder.types';
import { getPlayerContribution } from '../../pages/detail/tabs/team-builder/utils/team-index-calculator';
import { PlayerChipComponent } from './player-chip.component';

@Component({
  selector: 'app-builder-team-card',
  standalone: true,
  imports: [
    CommonModule,
    CdkDropList,
    CdkDrag,
    TranslateModule,
    CardModule,
    TagModule,
    ButtonModule,
    TooltipModule,
    ProgressBar,
    PlayerChipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './builder-team-card.component.html',
})
export class BuilderTeamCardComponent {
  team = input.required<TeamBuilderTeam>();
  sortBy = input<'name' | 'index'>('name');
  separateBackups = input(true);

  sortedPlayers = computed(() => {
    const players = [...this.team().players];
    const teamType = this.team().type;
    const sort = this.sortBy();

    const compareFn = (a: TeamBuilderPlayer, b: TeamBuilderPlayer) => {
      if (sort === 'index') {
        return getPlayerContribution(a, teamType) - getPlayerContribution(b, teamType);
      }
      // Name sort with ranking as secondary: single, double (and mix for MX)
      const nameCompare = a.lastName.localeCompare(b.lastName);
      if (nameCompare !== 0) return nameCompare;
      return getPlayerContribution(a, teamType) - getPlayerContribution(b, teamType);
    };

    let regulars: TeamBuilderPlayer[];
    let backups: TeamBuilderPlayer[];

    if (this.separateBackups()) {
      regulars = players.filter((p) => p.membershipType === 'REGULAR').sort(compareFn);
      backups = players.filter((p) => p.membershipType === 'BACKUP').sort(compareFn);
    } else {
      regulars = players.sort(compareFn);
      backups = [];
    }

    const isMX = teamType === 'MX';
    return {
      regulars,
      backups,
      regularMales: isMX ? regulars.filter((p) => p.gender === 'M') : [],
      regularFemales: isMX ? regulars.filter((p) => p.gender === 'F') : [],
      backupMales: isMX ? backups.filter((p) => p.gender === 'M') : [],
      backupFemales: isMX ? backups.filter((p) => p.gender === 'F') : [],
    };
  });

  playerDropped = output<CdkDragDrop<string>>();
  removeTeamClicked = output<void>();
  markForRemovalClicked = output<void>();
  membershipToggled = output<{ playerId: string; type: 'REGULAR' | 'BACKUP' }>();
  playerClicked = output<TeamBuilderPlayer>();
  subEventChanged = output<string>();
  subEventClicked = output<void>();

  get indexPercent(): number {
    const t = this.team();
    const max = t.selectedSubEvent?.maxBaseIndex;
    if (max == null || max <= 0) return 0;
    return Math.min((t.teamIndex / max) * 100, 100);
  }

  get indexSeverity(): 'success' | 'warn' | 'danger' {
    const t = this.team();
    const min = t.selectedSubEvent?.minBaseIndex;
    const max = t.selectedSubEvent?.maxBaseIndex;
    if (min != null && t.teamIndex < min) return 'danger';
    if (max == null) return 'success';
    if (t.teamIndex > max) return 'warn';
    return 'success';
  }

  get indexProgressClass(): string {
    switch (this.indexSeverity) {
      case 'danger':
        return 'team-index-danger';
      case 'warn':
        return 'team-index-warn';
      default:
        return '';
    }
  }

  get indexBarColor(): string {
    switch (this.indexSeverity) {
      case 'danger':
        return 'var(--p-red-500)';
      case 'warn':
        return 'var(--p-orange-500)';
      default:
        return 'var(--p-primary-color)';
    }
  }

  get indexRangeLabel(): string {
    const t = this.team();
    const min = t.selectedSubEvent?.minBaseIndex;
    const max = t.selectedSubEvent?.maxBaseIndex;
    if (min == null && max == null) {
      return '—';
    }
    return `${min ?? '?'} - ${max ?? '?'}`;
  }

  get levelRangeLabel(): string {
    const t = this.team();
    const minLevel = t.selectedSubEvent?.level;
    const maxLevel = t.selectedSubEvent?.maxLevel;
    if (minLevel == null && maxLevel == null) {
      return '—';
    }
    return `${minLevel ?? '?'} - ${maxLevel ?? '?'}`;
  }

  get regularCount(): number {
    return this.team().players.filter((p) => p.membershipType === 'REGULAR').length;
  }

  get backupCount(): number {
    return this.team().players.filter((p) => p.membershipType === 'BACKUP').length;
  }

  onDrop(event: CdkDragDrop<string>) {
    this.playerDropped.emit(event);
  }

  onMembershipToggle(playerId: string, type: 'REGULAR' | 'BACKUP') {
    this.membershipToggled.emit({ playerId, type });
  }

  onSubEventSelectionChange(value: string) {
    this.subEventChanged.emit(value);
  }

  onSubEventClick() {
    this.subEventClicked.emit();
  }
}
