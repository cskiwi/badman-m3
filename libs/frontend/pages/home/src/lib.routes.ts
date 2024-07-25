import { Route } from '@angular/router';
import { CenterLayoutComponent } from '@app/frontend-components/layout';
import { PageHomeComponent } from './pages/home/page-home.component';

export const pageHomeRoutes: Route[] = [
  {
    path: '',
    component: CenterLayoutComponent,
    children: [
      {
        path: '',
        component: PageHomeComponent,
        data: {
          revalidate: 0,
        },
      },
    ],
  },
];
