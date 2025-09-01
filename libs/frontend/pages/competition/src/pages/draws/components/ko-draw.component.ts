import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

interface BracketRound {
  roundNumber: number;
  matches: any[];
}

@Component({
  selector: 'app-ko-draw',
  imports: [DatePipe, TranslateModule],
  templateUrl: './ko-draw.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KoDrawComponent {
  encounters = input.required<any[]>();

  // Organize encounters into tournament rounds
  rounds = computed((): BracketRound[] => {
    const encounters = this.encounters();
    if (!encounters || encounters.length === 0) return [];

    // Group encounters by round (assuming encounters have a 'round' property)
    const roundsMap = new Map<number, any[]>();
    
    encounters.forEach(encounter => {
      const round = encounter.round || this.inferRoundFromPosition(encounter, encounters);
      if (!roundsMap.has(round)) {
        roundsMap.set(round, []);
      }
      roundsMap.get(round)!.push(encounter);
    });

    // Convert to sorted array of BracketRound objects
    return Array.from(roundsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNumber, matches]) => ({
        roundNumber,
        matches: matches.sort((a, b) => (a.position || 0) - (b.position || 0))
      }));
  });

  // Find tournament winner from final round
  winner = computed(() => {
    const rounds = this.rounds();
    if (rounds.length === 0) return null;

    const finalRound = rounds[rounds.length - 1];
    const finalMatch = finalRound.matches[0];
    
    if (!finalMatch || finalMatch.homeScore === null || finalMatch.awayScore === null) {
      return null;
    }

    const isHomeWinner = finalMatch.homeScore > finalMatch.awayScore;
    return {
      team: isHomeWinner ? finalMatch.homeTeam : finalMatch.awayTeam,
      player: isHomeWinner ? finalMatch.homePlayer : finalMatch.awayPlayer,
      score: isHomeWinner ? finalMatch.homeScore : finalMatch.awayScore
    };
  });

  // Helper method to get participant display name
  getParticipantName(team: any, player: any): string {
    if (team?.name) return team.name;
    if (player?.fullName) return player.fullName;
    if (player?.firstName && player?.lastName) return `${player.firstName} ${player.lastName}`;
    if (team?.id) return `Team ${team.id.slice(0, 8)}`;
    if (player?.id) return `Player ${player.id.slice(0, 8)}`;
    return 'TBD';
  }

  // Get round name based on position from final
  getRoundName(roundNumber: number, totalRounds: number): string {
    const fromFinal = totalRounds - roundNumber;
    
    switch (fromFinal) {
      case 0: return 'Final';
      case 1: return 'Semifinal';
      case 2: return 'Quarterfinal';
      case 3: return 'Round of 16';
      case 4: return 'Round of 32';
      default: return `Round ${roundNumber}`;
    }
  }

  // Infer round number from encounter data if not explicitly provided
  private inferRoundFromPosition(encounter: any, allEncounters: any[]): number {
    // If encounter has explicit round, use it
    if (encounter.round) return encounter.round;
    
    // Try to infer from position or other properties
    if (encounter.position !== undefined) {
      // Simple heuristic: higher positions are later rounds
      const maxPosition = Math.max(...allEncounters.map(e => e.position || 0));
      return Math.ceil((encounter.position / maxPosition) * 4) || 1;
    }
    
    // Default to round 1
    return 1;
  }
}