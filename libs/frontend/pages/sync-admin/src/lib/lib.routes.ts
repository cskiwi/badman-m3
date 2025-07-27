import { Route } from '@angular/router';

export const syncRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/sync-dashboard.component').then((m) => m.SyncDashboardComponent),
  },

  {
    path: 'team-matching',
    loadComponent: () => import('./team-matching/team-matching-dashboard.component').then((m) => m.TeamMatchingDashboardComponent),
  },
];
