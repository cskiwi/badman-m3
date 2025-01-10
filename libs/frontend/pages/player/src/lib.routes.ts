import { Route } from '@angular/router';
import { PageOverviewComponent } from './pages/overview/page-overview.component';
import { PageDetailComponent } from './pages/detail/page-detail.component';
import { CenterLayoutComponent } from '@app/frontend-components/layout';

export const routes: Route[] = [
  {
    path: '',
    component: CenterLayoutComponent,
    children: [
      { path: '', component: PageOverviewComponent },
      {
        path: ':playerId',
        children: [
          {
            path: '',
            component: PageDetailComponent,
          },
          {
            path: 'partners',
            loadComponent: () => import('./pages/partners/page-partner.component').then((m) => m.PagePartnerComponent),
          },
        ],
      },
    ],
  },
];
