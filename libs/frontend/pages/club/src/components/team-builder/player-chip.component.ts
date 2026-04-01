import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { TeamBuilderPlayer } from '../../pages/detail/tabs/team-builder/types/team-builder.types';

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

  membershipToggled = output<'REGULAR' | 'BACKUP'>();

  toggleMembership() {
    const current = this.player().membershipType;
    this.membershipToggled.emit(current === 'REGULAR' ? 'BACKUP' : 'REGULAR');
  }
}
