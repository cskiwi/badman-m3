import { Route } from '@angular/router';
import { pageHomeRoutes } from '@app/frontend-pages-home';

export const appRoutes: Route[] = [
  {
    path: '',
    children: pageHomeRoutes,
  },
];
