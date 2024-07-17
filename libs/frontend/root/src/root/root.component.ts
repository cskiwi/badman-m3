import { MediaMatcher } from '@angular/cdk/layout';
import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { AUTH, USER } from '@app/frontend-utils';
import { ClubMembershipType } from '@app/models/enums';
import { TranslateModule } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, map } from 'rxjs/operators';

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
  ],
  selector: 'app-root',
  templateUrl: './root.component.html',
  styleUrl: './root.component.scss',
})
export class RootComponent {
  mobileQuery: MediaQueryList;
  private platformId = inject<string>(PLATFORM_ID);

  user = inject(USER);
  auth = inject(AUTH);

  clubs = computed(() =>
    (this.user()?.clubPlayerMemberships ?? [])
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
      }),
  );

  login() {
    this.auth.loginWithRedirect();
  }

  private _mobileQueryListener: () => void;

  constructor(changeDetectorRef: ChangeDetectorRef, media: MediaMatcher) {
    this.mobileQuery = media.matchMedia('(max-width: 600px)');
    this._mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);

    if (isPlatformBrowser(this.platformId)) {
      const snackBar = inject(MatSnackBar);
      const updates = inject(SwUpdate);

      updates.versionUpdates
        .pipe(
          filter(
            (evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY',
          ),
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

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }
}
