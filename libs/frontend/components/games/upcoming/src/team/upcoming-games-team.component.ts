import { ChangeDetectionStrategy, Component, input } from '@angular/core';


@Component({
    selector: 'app-upcoming-games-team',
    imports: [],
    templateUrl: './upcoming-games-team.component.html',
    styleUrl: './upcoming-games-team.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpcomingGamesTeamComponent {
  for = input.required<string | string[]>();

}
