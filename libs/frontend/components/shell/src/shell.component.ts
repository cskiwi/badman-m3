import { isPlatformBrowser } from '@angular/common';
import { Component, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { AuthService } from '@app/frontend-modules-auth/service';
import { IS_MOBILE } from '@app/frontend-utils';
import { ClubMembershipType } from '@app/models/enums';
import { TranslateModule } from '@ngx-translate/core';
import { filter, map } from 'rxjs/operators';
import { SearchComponent } from './components';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  standalone: true,
  imports: [
    RouterModule,
    TranslateModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,

    SearchComponent,
  ],
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly platformId = inject<string>(PLATFORM_ID);

  isMobile = inject(IS_MOBILE);
  auth = inject(AuthService);

  user = this.auth.state.user;

  clubs = computed(() => {
    return (this.user()?.clubPlayerMemberships ?? [])
      .filter((membership) => membership?.active)
      .sort((a, b) => {
        // sort by membership type, first normal then loan
        if (a?.membershipType === b?.membershipType) {
          return 0;
        }

        if (a?.membershipType === ClubMembershipType.NORMAL) {
          return -1;
        }

        if (b?.membershipType === ClubMembershipType.NORMAL) {
          return 1;
        }

        return 0;
      });
  });

  login() {
    this.auth.state.login({
      appState: {
        target: window.location.pathname,
      },
    });
  }

  logout() {
    this.auth.state.logout();
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const snackBar = inject(MatSnackBar);
      const updates = inject(SwUpdate);

      updates.versionUpdates
        .pipe(
          filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
          map((evt) => ({
            type: 'UPDATE_AVAILABLE',
            current: evt.currentVersion,
            available: evt.latestVersion,
          })),
        )
        .subscribe(() => {
          snackBar
            .open(`New version available.`, 'refresh', { duration: 0 })
            .onAction()
            .subscribe(() => {
              document.location.reload();
            });
        });
    }
  }
}
