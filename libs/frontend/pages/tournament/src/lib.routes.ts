import { Route } from '@angular/router';
import { PageOverviewComponent } from './pages/overview/page-overview.component';
import { PageDetailComponent } from './pages/detail/page-detail.component';
import { PageDrawDetailComponent } from './pages/draw-detail/page-draw-detail.component';
import { PageClubDetailComponent } from './pages/club-detail/page-club-detail.component';
import { PageCreateComponent } from './pages/create/page-create.component';
import { PageEnrollmentComponent } from './pages/enrollment/page-enrollment.component';
import { PageMyEnrollmentsComponent } from './pages/my-enrollments/page-my-enrollments.component';
import { PageAdminComponent } from './pages/admin/page-admin.component';
import { PageLiveCourtsComponent } from './pages/live-courts/page-live-courts.component';
import { PageLiveResultsComponent } from './pages/live-results/page-live-results.component';
import { PageLiveUpcomingComponent } from './pages/live-upcoming/page-live-upcoming.component';
import { PageLiveKioskComponent } from './pages/live-kiosk/page-live-kiosk.component';
import { CenterLayoutComponent, FullWidthLayoutComponent } from '@app/frontend-components/layout';

export const routes: Route[] = [
  {
    path: '',
    component: CenterLayoutComponent,
    children: [
      { path: '', component: PageOverviewComponent },
      {
        path: 'club/:clubId',
        component: PageClubDetailComponent,
      },
      {
        path: 'create',
        component: PageCreateComponent,
      },
      {
        path: ':tournamentId',
        children: [
          {
            path: '',
            component: PageDetailComponent,
          },
          {
            path: 'admin',
            component: PageAdminComponent,
          },
          {
            path: 'my-enrollments',
            component: PageMyEnrollmentsComponent,
          },
          {
            path: 'sub-events/:subEventId/enroll',
            component: PageEnrollmentComponent,
          },
        ],
      },
    ],
  },
  {
    path: ':tournamentId/sub-events/:subEventId/draws/:drawId',
    component: FullWidthLayoutComponent,
    children: [
      {
        path: '',
        component: PageDrawDetailComponent,
      },
    ],
  },
  // Live display routes - public, no authentication required
  {
    path: ':tournamentId/live',
    component: FullWidthLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'courts',
        pathMatch: 'full',
      },
      {
        path: 'courts',
        component: PageLiveCourtsComponent,
      },
      {
        path: 'results',
        component: PageLiveResultsComponent,
      },
      {
        path: 'upcoming',
        component: PageLiveUpcomingComponent,
      },
      {
        path: 'kiosk',
        component: PageLiveKioskComponent,
      },
    ],
  },
];
