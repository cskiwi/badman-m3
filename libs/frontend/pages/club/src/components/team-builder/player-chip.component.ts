import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { TeamBuilderPlayer } from '../../pages/detail/tabs/team-builder/types/team-builder.types';

@Component({
  selector: 'app-player-chip',
  standalone: true,
  imports: [CommonModule, TranslateModule, TagModule, TooltipModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './player-chip.component.html',
})
export class PlayerChipComponent {
  player = input.required<TeamBuilderPlayer>();
  showMembershipToggle = input(false);

  membershipToggled = output<'REGULAR' | 'BACKUP'>();

  get tooltipContent(): string {
    const p = this.player();
    const survey = p.survey;
    if (!survey) return '';

    const lines: string[] = [];

    if (survey.team1Choice1) lines.push(`1st team pref: ${survey.team1Choice1}`);
    if (survey.team1Choice2) lines.push(`1st team alt: ${survey.team1Choice2}`);
    if (survey.team2Choice1) lines.push(`2nd team pref: ${survey.team2Choice1}`);
    if (survey.team2Choice2) lines.push(`2nd team alt: ${survey.team2Choice2}`);
    if (survey.preferredPlayDay) lines.push(`Preferred day: ${survey.preferredPlayDay}`);
    if (survey.desiredTeamCount) lines.push(`Teams wanted: ${survey.desiredTeamCount}`);
    if (survey.canMeet75PercentTeam1) lines.push(`75% team 1: ${survey.canMeet75PercentTeam1}`);
    if (survey.canMeet75PercentTeam2) lines.push(`75% team 2: ${survey.canMeet75PercentTeam2}`);
    if (survey.unavailabilityPeriodsTeam1) lines.push(`Unavailable team 1: ${survey.unavailabilityPeriodsTeam1}`);
    if (survey.unavailabilityPeriodsTeam2) lines.push(`Unavailable team 2: ${survey.unavailabilityPeriodsTeam2}`);
    if (survey.comments) lines.push(`Comments: ${survey.comments}`);

    return lines.join('\n');
  }

  toggleMembership() {
    const current = this.player().membershipType;
    this.membershipToggled.emit(current === 'REGULAR' ? 'BACKUP' : 'REGULAR');
  }
}
