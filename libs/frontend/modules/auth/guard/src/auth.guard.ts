import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '@app/frontend-modules-auth/service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  private readonly auth = inject(AuthService);

  private readonly router = inject(Router);

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
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
