import { Route } from '@angular/router';
import { PageOverviewComponent } from './pages/overview/page-overview.component';
import { PageDetailComponent } from './pages/detail/page-detail.component';
import { CenterLayoutComponent } from '@app/frontend-components/layout';

export const pageClubRoutes: Route[] = [
  {
    path: '',
    component: CenterLayoutComponent,
    children: [
      { path: '', component: PageOverviewComponent },
      {
        path: ':clubId',
        children: [
          {
            path: '',
            component: PageDetailComponent,
            data: {
              revalidate: 86400, // one day
            },
          },
        ],
      },
    ],
  },
];
