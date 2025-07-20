import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID, signal, untracked } from '@angular/core';
import { Player } from '@app/models';
import { AppState, AuthService as Auth0Service, RedirectLoginOptions } from '@auth0/auth0-angular';
import { Apollo, gql } from 'apollo-angular';
import { SsrCookieService } from 'ngx-cookie-service-ssr';
import { lastValueFrom, withLatestFrom } from 'rxjs';
import { AUTH_KEY } from './auth.key';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  apollo = inject(Apollo);
  platform = inject(PLATFORM_ID);
  cookie = inject(SsrCookieService);
  authService?: Auth0Service;

  // Signals for state management
  private userSignal = signal<Player | null>(null);
  private loggedInSignal = signal<boolean>(false);
  private loadedSignal = signal<boolean>(false);
  private tokenSignal = signal<string | null>(null);

  // Public computed properties
  user = computed(() => this.userSignal());
  loggedIn = computed(() => this.loggedInSignal());
  loaded = computed(() => this.loadedSignal());
  token = computed(() => this.tokenSignal());

  hasAnyPermission(requiredPermissions: string[]) {
    const claims = this.user()?.permissions || null;

    if (claims === null) {
      return false;
    }

    return requiredPermissions.some((perm) => claims.some((claim) => claim === perm));
  }

  hasAllPermission(requiredPermissions: string[]) {
    const claims = this.user()?.permissions || null;
    if (claims === null) {
      return false;
    }

    return requiredPermissions.every((perm) => claims.some((claim) => claim === perm));
  }

  // Public methods for actions
  async fetchUser(): Promise<void> {
    try {
      const result = await this.apollo
        .query<{ me: Player }>({
          query: gql`
            query {
              me {
                id
                firstName
                lastName
                fullName
                slug
                permissions
                clubPlayerMemberships {
                  id
                  active
                  membershipType
                  club {
                    id
                    name
                    slug
                  }
                }
              }
            }
          `,
        })
        .toPromise();

      let user = result?.data?.me || null;

      // If user is null, try to get info from Auth0
      if (!user?.id && this.authService?.user$) {
        const auth0User = await this.authService.user$.pipe().toPromise();
        if (auth0User) {
          user = {
            fullName: auth0User.nickname,
            firstName: auth0User.nickname?.split('.')[0],
            lastName: auth0User.nickname?.split('.')[1],
          } as Player;
        }
      }

      this.userSignal.set(user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      this.userSignal.set(null);
    }
  }

  async login(options?: RedirectLoginOptions<AppState>): Promise<void> {
    try {
      await this.authService?.loginWithRedirect(options);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  async logout(): Promise<void> {
    try {
      await withLatestFrom(this.authService!.logout());
      this.userSignal.set(null);
      this.loggedInSignal.set(false);
      this.loadedSignal.set(false);
      this.tokenSignal.set(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  async getToken(): Promise<void> {
    try {
      if (!this.authService) {
        throw new Error('AuthService is not initialized');
      }

      const token = await lastValueFrom(
        this.authService?.getAccessTokenSilently({
          cacheMode: 'off',
        }),
      );
      this.tokenSignal.set(token);
    } catch (error) {
      console.error('Failed to get token:', error);
      this.tokenSignal.set(null);
    }
  }

  constructor() {
    if (isPlatformBrowser(this.platform)) {
      this.authService = inject(Auth0Service);

      // Subscribe to Auth0 authentication state
      this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
        this.loggedInSignal.set(isAuthenticated);
        if (isAuthenticated) {
          this.getToken();
        }
      });
    } else {
      // Server-side: check for existing auth cookie
      if (this.cookie.check(AUTH_KEY)) {
        this.loggedInSignal.set(true);
        this.fetchUser();
      }
    }

    effect(async () => {
      const token = this.token();
      let user = null;
      // Technically we don't need to check this as apollo will fetch it from the local cache
      // However I prefer to have it here to make sure we have the user
      untracked(() => {
        user = this.user();
      });

      if (token && !user) {
        this.cookie.set(AUTH_KEY, token);
        await this.fetchUser();
      }
    });
  }
}
