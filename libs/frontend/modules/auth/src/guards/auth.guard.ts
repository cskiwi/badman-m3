import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { AUTH, USER$ } from '@app/frontend-utils';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  private readonly user = inject(USER$);
  private readonly auth = inject(AUTH);
  private readonly router = inject(Router);

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.auth.isAuthenticated$.pipe(
      switchMap((isAuthenticated) => {
        if (!isAuthenticated) {
          this.auth.loginWithRedirect({
            appState: { target: state.url },
          });

          return of(false);
        }

        return this.user.pipe(
          map((user) => {
            if (!user?.id) {
              this.router.navigate(['/']);
              return false;
            }

            return true;
          }),
        );
      }),
    );
  }
}
