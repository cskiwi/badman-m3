import { isPlatformBrowser } from '@angular/common';
import {
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { AUTH_KEY } from '@app/frontend-utils';
import { SsrCookieService } from 'ngx-cookie-service-ssr';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private platformId = inject<string>(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);

  intercept(request: HttpRequest<any>, next: HttpHandler) {
    const cookie = inject(SsrCookieService);
    return next.handle(
      request.clone({
        setHeaders: {
          Authorization: cookie.check(AUTH_KEY)
            ? `Bearer ${cookie.get(AUTH_KEY)}`
            : '',
        },
      }),
    );
  }
}
