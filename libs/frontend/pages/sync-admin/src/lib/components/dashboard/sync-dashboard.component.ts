import { Component } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { TabsModule } from 'primeng/tabs';

import { OverviewTabComponent } from '../overview-tab/overview-tab.component';
import { RankingTabComponent } from '../ranking-tab/ranking-tab.component';
import { SyncPlansTabComponent } from '../sync-plans-tab/sync-plans-tab.component';
import { CronJobsTabComponent } from '../cron-jobs-tab/cron-jobs-tab.component';

@Component({
  selector: 'app-sync-dashboard',
  standalone: true,
  imports: [TranslateModule, TabsModule, OverviewTabComponent, RankingTabComponent, SyncPlansTabComponent, CronJobsTabComponent],
  templateUrl: './sync-dashboard.component.html',
  styleUrl: './sync-dashboard.component.scss',
})
export class SyncDashboardComponent {}
