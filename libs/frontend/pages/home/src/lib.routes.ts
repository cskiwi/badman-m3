import { Route } from '@angular/router';
import { PageHomeComponent } from './pages/home/page-home.component';

export const pageHomeRoutes: Route[] = [
  {
    path: '',
    component: PageHomeComponent,
    data: {
      revalidate: 0,
    },
  },
];
