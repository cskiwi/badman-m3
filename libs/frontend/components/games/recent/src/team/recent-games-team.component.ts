import { ChangeDetectionStrategy, Component, input } from '@angular/core';


@Component({
    selector: 'app-recent-games-team',
    imports: [],
    templateUrl: './recent-games-team.component.html',
    styleUrl: './recent-games-team.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentGamesTeamComponent {
  for = input.required<string | string[]>();

}
