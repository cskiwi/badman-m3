import { Route } from '@angular/router';
import { FullWidthLayoutComponent } from '@app/frontend-components/layout';
import { PageAdminComponent } from './pages/admin/page-admin.component';

export const adminRoutes: Route[] = [
  {
    path: '',
    component: FullWidthLayoutComponent,
    children: [
      {
        path: '',
        component: PageAdminComponent,
      },
    ],
  },
];
