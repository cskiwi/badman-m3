import { MediaMatcher } from '@angular/cdk/layout';
import {
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { AUTH, DEVICE, USER } from '@app/frontend-utils';
import { ClubMembershipType } from '@app/models/enums';
import { TranslateModule } from '@ngx-translate/core';

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
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }
}
