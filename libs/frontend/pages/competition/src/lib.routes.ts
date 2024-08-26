import { Route } from '@angular/router';
import { PageOverviewComponent } from './pages/overview/page-overview.component';
import { PageDetailComponent } from './pages/detail/page-detail.component';
import { CenterLayoutComponent } from '@app/frontend-components/layout';

export const pageCompetitionRoutes: Route[] = [
  {
    path: '',
    component: CenterLayoutComponent,
    children: [
      { path: '', component: PageOverviewComponent },
      {
        path: ':competitionId',
        children: [
          {
            path: '',
            component: PageDetailComponent,
          
          },
        ],
      },
    ],
  },
];
