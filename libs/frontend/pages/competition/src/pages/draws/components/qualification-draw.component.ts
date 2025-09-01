import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-qualification-draw',
  imports: [DatePipe, TranslateModule, TooltipModule],
  templateUrl: './qualification-draw.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualificationDrawComponent {
  encounters = input.required<any[]>();
  standings = input.required<any[]>();

  // Enhanced standings with qualification status
  qualifiedStandings = computed(() => {
    const standings = this.standings();
    if (!standings || standings.length === 0) return [];

    // Sort standings and determine qualification status
    return standings
      .map((standing, index) => ({
        ...standing,
        position: standing.position || index + 1,
        qualified: this.isQualified(standing, index, standings.length),
        eliminated: this.isEliminated(standing, index, standings.length),
      }))
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  });

  // Helper method to get participant display name from standing
  getParticipantName(standing: any): string {
    if (standing.teamId) return `Team ${standing.teamId.slice(0, 8)}`;
    if (standing.player1?.fullName && standing.player2?.fullName) {
      return `${standing.player1.fullName} / ${standing.player2.fullName}`;
    }
    if (standing.player1?.fullName) return standing.player1.fullName;
    if (standing.player2?.fullName) return standing.player2.fullName;
    if (standing.player1Id && standing.player2Id) {
      return `Player ${standing.player1Id.slice(0, 8)} / ${standing.player2Id.slice(0, 8)}`;
    }
    if (standing.player1Id) return `Player ${standing.player1Id.slice(0, 8)}`;
    return 'TBD';
  }

  // Helper method to get participant display name from match
  getMatchParticipantName(team: any, player: any): string {
    if (team?.name) return team.name;
    if (player?.fullName) return player.fullName;
    if (player?.firstName && player?.lastName) return `${player.firstName} ${player.lastName}`;
    if (team?.id) return `Team ${team.id.slice(0, 8)}`;
    if (player?.id) return `Player ${player.id.slice(0, 8)}`;
    return 'TBD';
  }

  // Determine if a participant is qualified based on position and rules
  private isQualified(standing: any, index: number, totalCount: number): boolean {
    // If explicitly marked as qualified
    if (standing.qualified === true) return true;
    if (standing.eliminated === true) return false;

    // Simple heuristic: top 50% qualify, adjust based on typical tournament rules
    const qualificationThreshold = Math.ceil(totalCount * 0.5);
    return (standing.position || index + 1) <= qualificationThreshold;
  }

  // Determine if a participant is eliminated
  private isEliminated(standing: any, index: number, totalCount: number): boolean {
    // If explicitly marked as eliminated
    if (standing.eliminated === true) return true;
    if (standing.qualified === true) return false;

    // Simple heuristic: bottom 25% are eliminated
    const eliminationThreshold = Math.floor(totalCount * 0.75);
    return (standing.position || index + 1) > eliminationThreshold;
  }
}
