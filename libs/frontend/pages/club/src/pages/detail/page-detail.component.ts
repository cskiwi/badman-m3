import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { AuthService } from '@app/frontend-modules-auth/service';
import { SeoService } from '@app/frontend-modules-seo/service';
import { Team } from '@app/models';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { CardModule } from 'primeng/card';
import { DialogService } from 'primeng/dynamicdialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { TeamEditComponent } from '../../components/team-edit/team-edit.component';
import { DetailService } from './page-detail.service';
import { ClubPerformanceTabComponent, ClubScheduleTabComponent, ClubTeamsTabComponent } from './tabs';

@Component({
  selector: 'app-page-detail',
  imports: [
    ProgressBarModule,
    ReactiveFormsModule,
    SelectModule,
    TranslateModule,
    CardModule,
    TabsModule,
    PageHeaderComponent,
    ClubTeamsTabComponent,
    // ClubPlayersTabComponent,
    ClubPerformanceTabComponent,
    ClubScheduleTabComponent,
  ],
  providers: [DialogService],
  templateUrl: './page-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageDetailComponent {
  readonly dataService = new DetailService();
  private readonly seoService = inject(SeoService);
  private readonly clubId = injectParams('clubId');

  // selectors
  club = this.dataService.club;
  currentSeason = this.dataService.currentSeason;
  availableSeasons = this.dataService.availableSeasons;

  error = this.dataService.error;
  loading = this.dataService.loading;

  private readonly auth = inject(AuthService);

  // Form control getters
  get seasonControl() {
    return this.dataService.filter.get('season') as FormControl<number>;
  }

  private readonly dialogService = inject(DialogService);

  canEditTeam(team: Team): boolean {
    return this.auth.hasAnyPermission(['edit-any:team', 'edit-any:club', `${team.id}_edit:team`]);
  }

  editTeam(team: Team): void {
    const ref = this.dialogService.open(TeamEditComponent, {
      header: 'Edit Team',
      data: { team },
      width: '90%',
      maximizable: true,
      style: { maxWidth: '800px' },
    });

    ref?.onClose.subscribe((updatedTeam: Team | undefined) => {
      if (updatedTeam) {
        // Refresh club data
        this.dataService.filter.get('clubId')?.setValue(this.clubId());
      }
    });
  }

  constructor() {
    effect(() => {
      const clubId = this.clubId();
      if (clubId) {
        this.dataService.filter.get('clubId')?.setValue(clubId);
      }
    });

    effect(() => {
      const club = this.club();
      if (club) {
        this.seoService.update({
          seoType: 'club',
          club,
        });
      }
    });
  }
}
