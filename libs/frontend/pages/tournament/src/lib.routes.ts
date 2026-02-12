import { Route } from '@angular/router';















export const routes: Route[] = [
  {
    path: '',
    loadComponent: () => import('@app/frontend-components/layout').then(m => m.CenterLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/overview/page-overview.component').then(m => m.PageOverviewComponent) },
      {
        path: 'club/:clubId',
        loadComponent: () => import('./pages/club-detail/page-club-detail.component').then(m => m.PageClubDetailComponent),
      },
      {
        path: 'create',
        loadComponent: () => import('./pages/create/page-create.component').then(m => m.PageCreateComponent),
      },
      {
        path: ':tournamentId',
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/detail/page-detail.component').then(m => m.PageDetailComponent),
          },
          {
            path: 'edit',
            loadComponent: () => import('./pages/edit/page-edit.component').then(m => m.PageEditComponent),
          },
          {
            path: 'admin',
            loadComponent: () => import('./pages/admin/page-admin.component').then(m => m.PageAdminComponent),
          },
          {
            path: 'my-enrollments',
            loadComponent: () => import('./pages/my-enrollments/page-my-enrollments.component').then(m => m.PageMyEnrollmentsComponent),
          },
          {
            path: 'enroll',
            loadComponent: () => import('./pages/general-enrollment/page-general-enrollment.component').then(m => m.PageGeneralEnrollmentComponent),
          },
          {
            path: 'sub-events/:subEventId/enroll',
            loadComponent: () => import('./pages/enrollment/page-enrollment.component').then(m => m.PageEnrollmentComponent),
          },
        ],
      },
    ],
  },
  {
    path: ':tournamentId/sub-events/:subEventId/draws/:drawId',
    loadComponent: () => import('@app/frontend-components/layout').then(m => m.FullWidthLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/draw-detail/page-draw-detail.component').then(m => m.PageDrawDetailComponent),
      },
    ],
  },
  // Live display routes - public, no authentication required
  {
    path: ':tournamentId/live',
    loadComponent: () => import('@app/frontend-components/layout').then(m => m.FullWidthLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'courts',
        pathMatch: 'full',
      },
      {
        path: 'courts',
        loadComponent: () => import('./pages/live-courts/page-live-courts.component').then(m => m.PageLiveCourtsComponent),
      },
      {
        path: 'results',
        loadComponent: () => import('./pages/live-results/page-live-results.component').then(m => m.PageLiveResultsComponent),
      },
      {
        path: 'upcoming',
        loadComponent: () => import('./pages/live-upcoming/page-live-upcoming.component').then(m => m.PageLiveUpcomingComponent),
      },
      {
        path: 'kiosk',
        loadComponent: () => import('./pages/live-kiosk/page-live-kiosk.component').then(m => m.PageLiveKioskComponent),
      },
    ],
  },
];
