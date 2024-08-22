import {
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AUTH_KEY } from '@app/frontend-modules-auth/service';
import { SsrCookieService } from 'ngx-cookie-service-ssr';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
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
