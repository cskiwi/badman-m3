import { Route } from '@angular/router';




export const routes: Route[] = [
  {
    path: '',
    loadComponent: () => import('@app/frontend-components/layout').then(m => m.CenterLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/overview/page-overview.component').then(m => m.PageOverviewComponent) },
      {
        path: ':clubId',
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/detail/page-detail.component').then(m => m.PageDetailComponent),
          
          },
        ],
      },
    ],
  },
];
