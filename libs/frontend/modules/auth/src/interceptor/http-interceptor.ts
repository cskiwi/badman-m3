import { isPlatformBrowser } from '@angular/common';
import {
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { SsrCookieService } from 'ngx-cookie-service-ssr';
import { switchMap, tap } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private platformId = inject<string>(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);

  intercept(request: HttpRequest<any>, next: HttpHandler) {
    const cookie = inject(SsrCookieService);

    if (this.isBrowser) {

      const auth = inject(AuthService);
      return auth.getAccessTokenSilently().pipe(
        tap((token) => {
          cookie.set('token', token);
          console.log(`client cookie: ${cookie.get('token')}`);
        }),
        switchMap((token) => {
          return next.handle(
            request.clone({
              setHeaders: {
                'X-MY-APP-CLIENT': 'ssr',
                Authorization: `Bearer ${token}`,
              },
            }),
          );
        }),
      );
    }
    console.log(`server cookie: ${cookie.get('token')}`);
    console.log(cookie.getAll());

    return next.handle(
      request.clone({
        setHeaders: {
          'X-MY-APP-CLIENT': 'ssr',
          Authorization: `Bearer ${cookie.get('token')}`,
        },
      }),
    );
  }
}