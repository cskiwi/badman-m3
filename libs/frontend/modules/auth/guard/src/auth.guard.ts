import { isPlatformServer } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AUTH_KEY, AuthService } from '@app/frontend-modules-auth/service';
import { SsrCookieService } from 'ngx-cookie-service-ssr';


@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  private readonly auth = inject(AuthService);
  private readonly cookie = inject(SsrCookieService);
  private readonly router = inject(Router);
  private readonly platform = inject(PLATFORM_ID);

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    // On the server, AuthService already fetches user if AUTH_KEY is present
    if (isPlatformServer(this.platform)) {
      if (!this.cookie.check(AUTH_KEY)) {
        return false;
      }
      // User will be fetched by AuthService constructor; check signal
      if (!this.auth.user()?.id) {
        this.router.navigate(['/']);
        return false;
      }
      return true;
    }

    // On the client, use signals for state
    if (!this.auth.loggedIn()) {
      this.auth.login({
        appState: { target: state.url },
      });
      return false;
    }

    if (!this.auth.user()?.id) {
      this.router.navigate(['/']);
      return false;
    }

    return true;
  }
}
