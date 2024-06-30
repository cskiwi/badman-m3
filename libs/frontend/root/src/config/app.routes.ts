import { Route } from '@angular/router';
import { pageHomeRoutes } from '@app/frontend-pages-home';
import { pagePlayersRoutes } from '@app/frontend-pages-players';

export const appRoutes: Route[] = [
  {
    path: '',
    children: pageHomeRoutes,
  },

  {
    path: 'players',
    children: pagePlayersRoutes,
  },
];
