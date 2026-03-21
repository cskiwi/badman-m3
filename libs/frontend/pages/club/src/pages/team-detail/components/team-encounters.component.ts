import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Game, GamePlayerMembership } from '@app/models';
import { GameType } from '@app/models-enum';
import {
  getSetScores as _getSetScores,
  isBye as _isBye,
  getGameTeamMemberships,
  getWinnerIndicator as _getWinnerIndicator,
  getPlayerLevel as _getPlayerLevel,
} from '@app/utils/comp';

@Component({
  selector: 'app-team-encounters',
  imports: [DatePipe, RouterModule],
  templateUrl: './team-encounters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamEncountersComponent {
  encounters = input.required<any[]>();
  teamId = input.required<string>();

  expandedEncounters = new Set<string>();
  teamNumbers = [1, 2] as const;

  toggleEncounter(encounterId: string) {
    if (this.expandedEncounters.has(encounterId)) {
      this.expandedEncounters.delete(encounterId);
    } else {
      this.expandedEncounters.add(encounterId);
    }
  }

  isExpanded(encounterId: string): boolean {
    return this.expandedEncounters.has(encounterId);
  }

  isHomeTeam(encounter: any): boolean {
    return encounter.homeTeam?.id === this.teamId();
  }

  getResult(encounter: any): string | null {
    if (encounter.homeScore === null || encounter.homeScore === undefined) return null;
    if (encounter.awayScore === null || encounter.awayScore === undefined) return null;

    const isHome = this.isHomeTeam(encounter);
    const teamScore = isHome ? encounter.homeScore : encounter.awayScore;
    const opponentScore = isHome ? encounter.awayScore : encounter.homeScore;

    if (teamScore > opponentScore) return 'W';
    if (teamScore < opponentScore) return 'L';
    return 'D';
  }

  // Game helper methods (delegating to shared utils)
  getTeamMemberships(game: Game, teamNumber: 1 | 2): GamePlayerMembership[] {
    return getGameTeamMemberships(game, teamNumber);
  }

  getPlayerLevel(membership: GamePlayerMembership, gameType?: GameType): number | null {
    return _getPlayerLevel(membership, gameType);
  }

  getWinnerIndicator(game: Game, teamIndex: number): boolean {
    return _getWinnerIndicator(game, teamIndex);
  }

  isBye(game: Game): boolean {
    return _isBye(game);
  }

  getSetScores(game: Game): { team1Sets: number[]; team2Sets: number[] } {
    return _getSetScores(game);
  }
}
