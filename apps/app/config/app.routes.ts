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
      import('@app/frontend-pages-player').then((m) => m.pagePlayersRoutes),
  },
  {
    path: 'club',
    loadChildren: () =>
      import('@app/frontend-pages-club').then((m) => m.pageClubRoutes),
  },
  {
    path: 'competition',
    loadChildren: () =>
      import('@app/frontend-pages-competition').then(
        (m) => m.pageCompetitionRoutes,
      ),
  },
];
