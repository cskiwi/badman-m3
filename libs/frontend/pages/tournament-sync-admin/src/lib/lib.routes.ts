import { Route } from '@angular/router';

export const tournamentSyncAdminRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/tournament-sync-dashboard.component').then((m) => m.TournamentSyncDashboardComponent),
  },

  {
    path: 'team-matching',
    loadComponent: () => import('./team-matching/team-matching-dashboard.component').then((m) => m.TeamMatchingDashboardComponent),
  },
];
