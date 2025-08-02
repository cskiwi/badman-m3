import { Route } from '@angular/router';
import { pageHomeRoutes } from '@app/frontend-pages-home';

export const appRoutes: Route[] = [
  {
    path: '',
    children: pageHomeRoutes,
  },

  {
    path: 'player',
    loadChildren: () =>
      import('@app/frontend-pages-player').then((m) => m.routes),
  },
  {
    path: 'club',
    loadChildren: () =>
      import('@app/frontend-pages-club').then((m) => m.routes),
  },
  {
    path: 'competition',
    loadChildren: () =>
      import('@app/frontend-pages-competition').then((m) => m.routes),
  },
  {
    path: 'tournament',
    loadChildren: () =>
      import('@app/frontend-pages-tournament').then((m) => m.routes),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('@app/frontend-pages-admin').then((m) => m.adminRoutes),
  },
];
