import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AUTH, USER$ } from '@app/frontend-utils';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  private readonly user = inject(USER$);
  private readonly auth = inject(AUTH);
  private readonly router = inject(Router);

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.user.pipe(
      map((user) => {
        if (!user.authenticated) {
          this.auth?.loginWithRedirect({
            appState: { target: state.url },
          });

          return of(false);
        }

        if (!user?.id) {
          this.router.navigate(['/']);
          return false;
        }

        return true;
      }),
    );
  }
}
