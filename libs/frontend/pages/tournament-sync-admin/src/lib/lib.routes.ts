import { Route } from '@angular/router';
import { TournamentSyncDashboardComponent } from './dashboard/tournament-sync-dashboard.component';
import { TeamMatchingComponent } from './team-matching/team-matching.component';

export const tournamentSyncAdminRoutes: Route[] = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: TournamentSyncDashboardComponent },
  { path: 'team-matching', component: TeamMatchingComponent },
];
