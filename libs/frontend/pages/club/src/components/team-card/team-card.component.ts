import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { Team } from '@app/models';
import { PhoneNumberPipe } from '@app/frontend-utils';
import { TeamGameStatsComponent } from './team-game-stats.component';

@Component({
  selector: 'app-team-card',
  standalone: true,
  imports: [RouterModule, TranslateModule, BadgeModule, ButtonModule, SkeletonModule, PhoneNumberPipe, TeamGameStatsComponent],
  templateUrl: './team-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamCardComponent {
  team = input.required<Team>();
  clubId = input.required<string>();
  canEdit = input<boolean>(false);

  editClicked = output<Team>();

  expanded = false;

  togglePlayers() {
    this.expanded = !this.expanded;
  }
  
}
