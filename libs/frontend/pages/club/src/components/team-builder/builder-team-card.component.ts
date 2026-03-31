import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDropList, CdkDrag, CdkDragDrop } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TeamBuilderPlayer, TeamBuilderTeam } from '../../pages/detail/tabs/team-builder/types/team-builder.types';
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
        return getPlayerContribution(b, teamType) - getPlayerContribution(a, teamType);
      }
      return a.lastName.localeCompare(b.lastName);
    };

    if (this.separateBackups()) {
      const regulars = players.filter((p) => p.membershipType === 'REGULAR').sort(compareFn);
      const backups = players.filter((p) => p.membershipType === 'BACKUP').sort(compareFn);
      return { regulars, backups };
    }

    return { regulars: players.sort(compareFn), backups: [] as TeamBuilderPlayer[] };
  });

  playerDropped = output<CdkDragDrop<string>>();
  promoteClicked = output<void>();
  removeTeamClicked = output<void>();
  markForRemovalClicked = output<void>();
  membershipToggled = output<{ playerId: string; type: 'REGULAR' | 'BACKUP' }>();

  get indexPercent(): number {
    const t = this.team();
    if (!t.maxAllowedIndex) return 0;
    return Math.min((t.teamIndex / t.maxAllowedIndex) * 100, 100);
  }

  get indexSeverity(): 'success' | 'warn' | 'danger' {
    const t = this.team();
    if (!t.maxAllowedIndex) return 'success';
    if (t.teamIndex > t.maxAllowedIndex) return 'danger';
    if (t.teamIndex > t.maxAllowedIndex * 0.9) return 'warn';
    return 'success';
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
}
