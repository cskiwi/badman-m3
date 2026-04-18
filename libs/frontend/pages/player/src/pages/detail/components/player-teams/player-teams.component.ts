import { ChangeDetectionStrategy, Component, computed, effect, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TeamPlayerMembership } from '@app/models';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChipModule } from 'primeng/chip';
import { PlayerTeamsService } from './player-teams.service';

const MEMBERSHIP_ORDER: Record<string, number> = {
  REGULAR: 0,
  BACKUP: 1,
};

@Component({
  selector: 'app-player-teams',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ProgressBarModule, ChipModule],
  templateUrl: './player-teams.component.html',
  styleUrl: './player-teams.component.scss',
})
export class PlayerTeamsComponent {
  private readonly teamsService = new PlayerTeamsService();

  readonly playerId = input.required<string>();
  readonly loading = this.teamsService.loading;

  readonly memberships = computed(() => {
    const items = [...this.teamsService.memberships()];
    return items.sort((a, b) => {
      const oa = MEMBERSHIP_ORDER[a.membershipType] ?? 99;
      const ob = MEMBERSHIP_ORDER[b.membershipType] ?? 99;
      return oa - ob;
    });
  });

  abbreviation(team: TeamPlayerMembership['team']): string {
    if (!team) return '—';
    if (team.teamNumber != null && team.type) {
      const genderCode: Record<string, string> = { M: 'H', F: 'D', MX: 'G' };
      const letter = genderCode[team.type] ?? team.type;

      return `${team.teamNumber}${letter}`;
    }
    return (team.name ?? '—').slice(0, 2);
  }

  constructor() {
    effect(() => {
      this.teamsService.filter.get('playerId')?.setValue(this.playerId());
    });
  }
}
