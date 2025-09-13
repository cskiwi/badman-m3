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
            path: 'tournaments',
            loadComponent: () => import('@app/frontend-pages-tournament/player-detail').then((m) => m.PagePlayerDetailComponent),
          },
          {
            path: 'head-to-head',
            loadComponent: () => import('./pages/head-to-head/page-head-to-head.component').then((m) => m.PageHeadToHeadComponent),
          },
          {
            path: 'edit',
            loadComponent: () => import('./pages/edit/page-edit.component').then((m) => m.PageEditComponent),
          },
        ],
      },
    ],
  },
];
