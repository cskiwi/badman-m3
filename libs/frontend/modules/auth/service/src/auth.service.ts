import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID, untracked } from '@angular/core';
import { Player } from '@app/models';
import { AppState, AuthService as Auth0Service, RedirectLoginOptions } from '@auth0/auth0-angular';
import { Apollo, gql } from 'apollo-angular';
import { SsrCookieService } from 'ngx-cookie-service-ssr';
import { signalSlice } from 'ngxtension/signal-slice';
import { iif, merge, Observable, of } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { AUTH_KEY } from './auth.key';

export interface AuthState {
  user: Player | null;
  loggedIn: boolean;
  loaded: boolean;
  token: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  apollo = inject(Apollo);
  platform = inject(PLATFORM_ID);
  cookie = inject(SsrCookieService);
  authService?: Auth0Service;

  initialState: AuthState = {
    user: null,
    loaded: false,
    loggedIn: false,
    token: null,
  };

  user = computed(() => this.state().user);

  loggedin$ = () => {
    if (isPlatformServer(this.platform)) {
      if (this.cookie.check(AUTH_KEY)) {
        return this.fetchUser().pipe(
          map((user) => {
            return {
              loggedIn: true,
              // we can already fetch our user if we have a token
              user,
            };
          }),
        );
      }
      return of({
        loggedIn: false,
      });
    } else {
      const authService = inject(Auth0Service);
      return authService.isAuthenticated$.pipe(
        map((loggedIn) => ({
          loggedIn,
        })),
      );
    }
  };

  sources$ = merge(this.loggedin$());

  // sources
  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
    actionSources: {
      fetchUser: (_state, action$: Observable<void>) =>
        action$.pipe(
          switchMap(() => this.fetchUser()),

          // if null fetch some info from the auth0 user
          switchMap((user) =>
            iif(
              () => user.id === null,
              this.authService?.user$.pipe(
                map(
                  (p) =>
                    ({
                      fullName: p?.nickname,
                      firstName: p?.nickname?.split('.')[0],
                      lastName: p?.nickname?.split('.')[1],
                    }) as Player,
                ),
              ) ?? of(null),
              of(user),
            ),
          ),
          map((user) => ({
            user,
          })),
        ),
      login: (_state, action$: Observable<RedirectLoginOptions<AppState> | void>) =>
        action$.pipe(
          switchMap((options) => {
            return this.authService?.loginWithRedirect(options ?? undefined) ?? of();
          }),
          map(() => _state()),
        ),
      logout: (_state, action$: Observable<void>) =>
        action$.pipe(
          switchMap(() => {
            return this.authService?.logout() ?? of();
          }),
          map(() => {
            return this.initialState;
          }),
        ),
      getToken: (_state, action$: Observable<void>) =>
        action$.pipe(
          switchMap(() => {
            const token =
              this.authService?.getAccessTokenSilently({
                cacheMode: 'off',
              }) ?? of();

            return token;
          }),

          map((token) => {
            return {
              token,
            };
          }),
        ),
    },
  });

  constructor() {
    if (isPlatformBrowser(this.platform)) {
      this.authService = inject(Auth0Service);
    }

    effect(async () => {
      if (this.state.loggedIn()) {
        await this.state.getToken();
      }
    }, {
      allowSignalWrites: true,
    });

    effect(async () => {
      const token = this.state.token();
      let user = null;
      // Technically we don't need to check this as apollo will fetch it from the local cache
      // Howevr I prefer to have it here to make sure we have the user
      untracked(() => {
        user = this.state.user();
      });

      if (token && !user) {
        this.cookie.set(AUTH_KEY, token);
        await this.state.fetchUser();
      }
    }, {
      allowSignalWrites: true,
    });
  }
  fetchUser() {
    return this.apollo
      .query<{
        me: Player;
      }>({
        query: gql`
          query {
            me {
              id
              firstName
              lastName
              fullName
              slug
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
      .pipe(
        filter((user) => !!user),
        map((result) => result.data.me),
      );
  }
}
