import { Route } from '@angular/router';
import { PageOverviewComponent } from './pages/overview/page-overview.component';
import { PageDetailComponent } from './pages/detail/page-detail.component';
import { PageDrawDetailComponent } from './pages/draw-detail/page-draw-detail.component';
import { PageClubDetailComponent } from './pages/club-detail/page-club-detail.component';
import { CenterLayoutComponent, FullWidthLayoutComponent } from '@app/frontend-components/layout';

export const routes: Route[] = [
  {
    path: '',
    component: CenterLayoutComponent,
    children: [
      { path: '', component: PageOverviewComponent },
      {
        path: 'players',
        loadChildren: () => import('@app/frontend-pages-player').then((m) => m.routes),
      },
      {
        path: 'clubs', 
        loadChildren: () => import('@app/frontend-pages-club').then((m) => m.routes),
      },
      {
        path: 'club/:clubId',
        component: PageClubDetailComponent,
      },
      {
        path: ':tournamentId',
        children: [
          {
            path: '',
            component: PageDetailComponent,
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
];
