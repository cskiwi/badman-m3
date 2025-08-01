import { Route } from '@angular/router';
import { CenterLayoutComponent } from '@app/frontend-components/layout';
import { PageAdminComponent } from './pages/admin/page-admin.component';

export const adminRoutes: Route[] = [
  {
    path: '',
    component: CenterLayoutComponent,
    children: [
      {
        path: '',
        component: PageAdminComponent,
      },
      {
        path: 'sync',
        children: [
          {
            path: '',
            redirectTo: 'dashboard',
            pathMatch: 'full',
          },
          {
            path: 'dashboard',
            loadComponent: () => import('@app/frontend-pages-sync-admin').then((m) => m.SyncDashboardComponent),
          },
          {
            path: 'team-matching',
            loadComponent: () => import('@app/frontend-pages-sync-admin').then((m) => m.TeamMatchingDashboardComponent),
          },
        ],
      },
    ],
  },
];
