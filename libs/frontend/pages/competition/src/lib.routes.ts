import { Route } from '@angular/router';





export const routes: Route[] = [
  {
    path: '',
    loadComponent: () => import('@app/frontend-components/layout').then(m => m.CenterLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/overview/page-overview.component').then(m => m.PageOverviewComponent) },
      {
        path: ':competitionId',
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/detail/page-detail.component').then(m => m.PageDetailComponent),
          },
          {
            path: 'edit',
            loadComponent: () => import('./pages/edit/page-edit.component').then(m => m.PageEditComponent),
          },
          {
            path: 'sub-events/:subEventId/draws/:drawId',
            loadComponent: () => import('./pages/draws/page-draws.component').then(m => m.PageDrawsComponent),
          },
        ],
      },
    ],
  },
];
