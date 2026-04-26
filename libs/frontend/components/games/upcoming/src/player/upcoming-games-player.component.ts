import { Component, computed, effect, inject, input } from '@angular/core';

import { IS_MOBILE } from '@app/frontend-utils';
import { SkeletonModule } from 'primeng/skeleton';
import { PlayerUpcommingGamesService } from './upcoming-games-player.service';
import { CompetitionEncounter } from '@app/models';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { DayjsFormatPipe } from '@app/frontend-utils/dayjs/fmt';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-upcoming-games-player',
  imports: [DayjsFormatPipe, SkeletonModule, TranslateModule, RouterModule, ButtonModule, ChipModule, TagModule],
  templateUrl: './upcoming-games-player.component.html',
  styleUrls: ['./upcoming-games-player.component.scss'],
})
export class UpcomingGamesPlayerComponent {
  for = input.required<string | string[]>();
  isMobile = inject(IS_MOBILE);

  private playerGamesService = new PlayerUpcommingGamesService();

  games = this.playerGamesService.games;
  loading = this.playerGamesService.loading;
  private teamIds = this.playerGamesService.teamIds;

  constructor() {
    effect(() => {
      // take the first playerId if multiple are provided
      let id = this.for();
      if (Array.isArray(id)) {
        id = id[0];
      }

      this.playerGamesService.filter.patchValue({ playerId: id });
    });
  }

  getAssemblyParams(game: CompetitionEncounter): Record<string, string> {
    const params: Record<string, string> = { encounter: game.id! };
    const ids = this.teamIds();

    // Determine which team belongs to the player
    const homeId = game.homeTeam?.id;
    const awayId = game.awayTeam?.id;
    const matchedTeamId = ids.find((id) => id === homeId || id === awayId);

    if (matchedTeamId) {
      params['team'] = matchedTeamId;
      // Get the club from the matched team
      const matchedTeam = matchedTeamId === homeId ? game.homeTeam : game.awayTeam;
      if (matchedTeam?.club?.id) {
        params['club'] = matchedTeam.club.id;
      }
    }

    // Get season from the competition event
    const season = game.drawCompetition?.competitionSubEvent?.competitionEvent?.season;
    if (season) {
      params['season'] = String(season);
    }

    return params;
  }

  /**
   * Determines whether the upcoming game is played at the player's team's venue.
   * Returns true for a home game, false for an away game, null when we cannot tell.
   */
  isHomeGame(game: CompetitionEncounter): boolean | null {
    const homeId = game?.homeTeam?.id;
    const awayId = game?.awayTeam?.id;
    if (!homeId && !awayId) return null;

    const ids = this.teamIds();
    if (ids.includes(homeId ?? '')) return true;
    if (ids.includes(awayId ?? '')) return false;
    return null;
  }
}
