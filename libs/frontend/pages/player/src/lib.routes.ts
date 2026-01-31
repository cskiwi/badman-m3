import { Route } from '@angular/router';




export const routes: Route[] = [
  {
    path: '',
    loadComponent: () => import('@app/frontend-components/layout').then(m => m.CenterLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/overview/page-overview.component').then(m => m.PageOverviewComponent) },
      {
        path: ':playerId',
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/detail/page-detail.component').then(m => m.PageDetailComponent),
          },
          {
            path: 'tournaments',
            loadChildren: () => import('@app/frontend-pages-tournament').then((m) => m.routes),
          },
          {
            path: 'head-to-head',
            loadComponent: () => import('./pages/head-to-head/page-head-to-head.component').then((m) => m.PageHeadToHeadComponent),
          },
          {
            path: 'edit',
            loadComponent: () => import('./pages/edit/page-edit.component').then((m) => m.PageEditComponent),
          },
          {
            path: 'ranking/:type',
            loadComponent: () =>
              import('./pages/ranking-breakdown/page-ranking-breakdown.component').then(
                (m) => m.PageRankingBreakdownComponent,
              ),
          },
        ],
      },
    ],
  },
];
