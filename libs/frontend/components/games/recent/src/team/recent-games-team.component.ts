import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-recent-games-team',
    imports: [CommonModule],
    templateUrl: './recent-games-team.component.html',
    styleUrl: './recent-games-team.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentGamesTeamComponent {
  for = input.required<string | string[]>();

}
