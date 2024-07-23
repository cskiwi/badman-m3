import { Route } from '@angular/router';
import { pageHomeRoutes } from '@app/frontend-pages-home';
import { pagePlayersRoutes } from '@app/frontend-pages-player';
import { pageClubRoutes } from '@app/frontend-pages-club';

export const appRoutes: Route[] = [
  {
    path: '',
    children: pageHomeRoutes,
  },

  {
    path: 'player',
    children: pagePlayersRoutes,
  },
  {
    path: 'club',
    children: pageClubRoutes,
  },
];
