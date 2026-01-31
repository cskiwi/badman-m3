import { Route } from '@angular/router';



export const pageHomeRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('@app/frontend-components/layout').then(m => m.CenterLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home/page-home.component').then(m => m.PageHomeComponent),
       
      },
    ],
  },
];
