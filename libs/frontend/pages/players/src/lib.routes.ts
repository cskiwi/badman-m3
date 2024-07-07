import { Route } from '@angular/router';
import { PageOverviewComponent } from './pages/overview/page-overview.component';
import { PageDetailComponent } from './pages/detail/page-detail.component';

export const pagePlayersRoutes: Route[] = [
  { path: '', component: PageOverviewComponent },
  {
    path: ':playerId',
    children: [
      {
        path: '',
        component: PageDetailComponent,
        data: {
          revalidate: 86400,
        },
      },
    ],
  },
];
