import { InjectionToken, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AUTH_KEY } from '@app/frontend-modules-auth';
import { Player } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { SsrCookieService } from 'ngx-cookie-service-ssr';
import { of } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export const USER$ = new InjectionToken('USER', {
  providedIn: 'root',
  factory: () => {
    const cookie = inject(SsrCookieService);

    if (!cookie.check(AUTH_KEY)) {
      return of({
        id: undefined,
        name: undefined,
        authenticated: false,
      } as const as Partial<Player> & { authenticated: boolean });
    }

    const apollo = inject(Apollo);
    return apollo
      .query<{
        me: Player;
      }>({
        query: gql`
          query {
            me {
              id
              firstName
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

        map(
          (result) =>
            ({
              ...result.data.me,
              authenticated: true,
            }) as Player & { authenticated: boolean },
        ),
      );
  },
});

export const USER = new InjectionToken('USER', {
  providedIn: 'root',
  factory: () => {
    const user = inject(USER$);

    if (!user) {
      return signal(undefined);
    }

    return toSignal(user);
  },
});
