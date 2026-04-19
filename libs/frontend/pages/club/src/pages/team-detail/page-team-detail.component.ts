import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EncounterCardComponent } from '@app/frontend-components/games/encounter-card';
import { HeroComponent } from '@app/frontend-components/hero';
import { AuthService } from '@app/frontend-modules-auth/service';
import { SeoService } from '@app/frontend-modules-seo/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { TeamDetailService } from './page-team-detail.service';
import { TeamPlayersTableComponent } from './components/team-players-table.component';

@Component({
  selector: 'app-page-team-detail',
  imports: [
    RouterModule,
    TranslateModule,
    DatePipe,
    EncounterCardComponent,
    HeroComponent,
    SkeletonModule,
    TeamPlayersTableComponent,
    TooltipModule,
  ],
  templateUrl: './page-team-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class PageTeamDetailComponent {
  private readonly dataService = new TeamDetailService();
  private readonly seoService = inject(SeoService);
  private readonly authService = inject(AuthService);
  readonly teamId = injectParams('teamId');

  // selectors
  team = this.dataService.team;
  players = this.dataService.players;
  playerStats = this.dataService.playerStats;
  entry = this.dataService.entry;
  encounters = this.dataService.encounters;
  playedEncounters = this.dataService.playedEncounters;
  upcomingEncounters = this.dataService.upcomingEncounters;
  error = this.dataService.error;
  loading = this.dataService.loading;

  /** Short team code for the hero crest (last "word" of the name, e.g. "2G" for "Smash For Fun 2G") */
  teamCode = computed(() => {
    const t = this.team();
    if (!t) return '';
    const name = (t.name ?? '').trim();
    const tokens = name.split(/\s+/).filter(Boolean);
    const last = tokens[tokens.length - 1] ?? '';
    // Prefer last token if it is a short alphanumeric code (2-3 chars), else fall back to abbreviation
    if (/^[A-Za-z0-9]{1,4}$/.test(last)) {
      return last.toUpperCase();
    }
    if (t.abbreviation) {
      const parts = t.abbreviation.trim().split(/\s+/);
      return (parts[parts.length - 1] ?? '').toUpperCase();
    }
    return last.toUpperCase();
  });

  /** Aggregate W/L over played encounters from this team's perspective */
  teamStats = computed(() => {
    const t = this.team();
    const played = this.playedEncounters();
    if (!t || played.length === 0) return { played: 0, won: 0, lost: 0, winRate: 0 };

    let won = 0;
    let lost = 0;
    for (const enc of played) {
      const isHome = enc.homeTeam?.id === t.id;
      const home = enc.homeScore ?? 0;
      const away = enc.awayScore ?? 0;
      if (home === away) continue;
      const teamWon = isHome ? home > away : away > home;
      if (teamWon) won++;
      else lost++;
    }
    const total = won + lost;
    return { played: played.length, won, lost, winRate: total > 0 ? won / total : 0 };
  });

  canEditClub = computed(() => {
    const clubId = this.team()?.club?.id;
    if (!clubId) return false;
    return this.authService.hasAnyPermission(['edit-any:club', `${clubId}_edit:club`]);
  });

  constructor() {
    effect(() => {
      const teamId = this.teamId();
      if (teamId) {
        this.dataService.filter.get('teamId')?.setValue(teamId);
      }
    });

    effect(() => {
      const team = this.team();
      if (team) {
        this.seoService.update({
          seoType: 'generic',
          title: `${team.name} - Team Details`,
          description: `Details for team ${team.name}`,
        });
      }
    });
  }

  onAddPlayerToTeam = async (playerId: string): Promise<void> => {
    const teamId = this.team()?.id;
    if (teamId) {
      await this.dataService.addPlayerToTeam(teamId, playerId);
    }
  };

  onRemovePlayerFromTeam = async (membershipId: string): Promise<void> => {
    await this.dataService.removePlayerFromTeam(membershipId);
  };
}
