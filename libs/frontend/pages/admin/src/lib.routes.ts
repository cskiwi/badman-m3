import { Route } from '@angular/router';



export const adminRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('@app/frontend-components/layout').then(m => m.FullWidthLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/admin/page-admin.component').then(m => m.PageAdminComponent),
      },
    ],
  },
];
