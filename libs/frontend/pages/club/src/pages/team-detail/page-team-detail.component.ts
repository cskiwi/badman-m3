import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { EncounterCardComponent } from '@app/frontend-components/games/encounter-card';
import { SeoService } from '@app/frontend-modules-seo/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { TeamDetailService } from './page-team-detail.service';
import { TeamPlayersTableComponent } from './components/team-players-table.component';

@Component({
  selector: 'app-page-team-detail',
  imports: [
    RouterModule,
    TranslateModule,
    PageHeaderComponent,
    SkeletonModule,
    CardModule,
    EncounterCardComponent,
    TeamPlayersTableComponent,
    Tag,
    TooltipModule,
  ],
  templateUrl: './page-team-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class PageTeamDetailComponent {
  private readonly dataService = new TeamDetailService();
  private readonly seoService = inject(SeoService);
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

  onLoadGames = async (encounterId: string): Promise<void> => {
    await this.dataService.loadEncounterGames(encounterId);
  };
}
