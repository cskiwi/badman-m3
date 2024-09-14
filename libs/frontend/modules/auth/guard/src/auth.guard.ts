import { isPlatformServer } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AUTH_KEY, AuthService } from '@app/frontend-modules-auth/service';
import { SsrCookieService } from 'ngx-cookie-service-ssr';
import { map, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  private readonly auth = inject(AuthService);
  private readonly cookie = inject(SsrCookieService);
  private readonly router = inject(Router);
  private readonly platform = inject(PLATFORM_ID);

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    // on the server we need to check if we have a token and fetch the user
    if (isPlatformServer(this.platform)) {
      if (this.cookie.check(AUTH_KEY)) {
        return this.auth.fetchUser().pipe(
          map((user) => {
            if (!user?.id) {
              this.router.navigate(['/']);
              return false;
            }
            return true;
          }),
        );
      }
      return of(false);
    }

    // on the client we can just check the state
    if (!this.auth?.state.loggedIn()) {
      this.auth.state.login({
        appState: { target: state.url },
      });

      return false;
    }

    if (!this.auth?.state.user()?.id) {
      this.router.navigate(['/']);
      return false;
    }

    return true;
  }
}
