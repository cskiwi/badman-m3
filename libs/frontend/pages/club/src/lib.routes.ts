import { Route } from '@angular/router';

export const routes: Route[] = [
  {
    path: '',
    loadComponent: () => import('@app/frontend-components/layout').then((m) => m.CenterLayoutComponent),
    children: [
      {
        path: ':clubId',
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/detail/page-detail.component').then((m) => m.PageDetailComponent),
          },
          {
            path: 'teams',
            children: [
              {
                path: ':teamId',
                loadComponent: () => import('./pages/team-detail/page-team-detail.component').then((m) => m.PageTeamDetailComponent),
              },
            ],
          },
        ],
      },
    ],
  },
];
