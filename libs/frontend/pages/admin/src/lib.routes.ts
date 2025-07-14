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
    ],
  },
];
