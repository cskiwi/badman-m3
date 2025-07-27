import { Route } from '@angular/router';
import { PageOverviewComponent } from './pages/overview/page-overview.component';
import { PageDetailComponent } from './pages/detail/page-detail.component';
import { PageDrawsComponent } from './pages/draws/page-draws.component';
import { CenterLayoutComponent } from '@app/frontend-components/layout';

export const routes: Route[] = [
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
          {
            path: 'sub-events/:subEventId/draws/:drawId',
            component: PageDrawsComponent,
          },
        ],
      },
    ],
  },
];
