import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { TeamBuilderPlayer } from '../../pages/detail/tabs/team-builder/types/team-builder.types';
import { getPlayerRanking } from '../../pages/detail/tabs/team-builder/utils/team-index-calculator';

@Component({
  selector: 'app-player-chip',
  standalone: true,
  imports: [CommonModule, TranslateModule, TagModule, TooltipModule, ButtonModule, PopoverModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './player-chip.component.html',
})
export class PlayerChipComponent {
  player = input.required<TeamBuilderPlayer>();
  showMembershipToggle = input(false);
  showMixedRanking = input(true);

  ranking = computed(() => {
    const p = this.player();
    const r = p.rankingLastPlaces?.[0];
    return {
      single: r?.single ?? 12,
      double: r?.double ?? 12,
      mix: r?.mix ?? 12,
    };
  });

  membershipToggled = output<'REGULAR' | 'BACKUP'>();
  playerClicked = output<TeamBuilderPlayer>();

  /** Returns true when the 75% availability answer is negative (i.e., player cannot meet 75%) */
  isNegative75(value: string | undefined): boolean {
    if (!value) return false;
    const v = value.trim().toLowerCase();
    return v === 'nee' || v === 'no' || v === 'false' || v === 'non';
  }

  toggleMembership() {
    const current = this.player().membershipType;
    this.membershipToggled.emit(current === 'REGULAR' ? 'BACKUP' : 'REGULAR');
  }
}
