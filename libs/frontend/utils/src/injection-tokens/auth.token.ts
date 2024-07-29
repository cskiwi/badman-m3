import { isPlatformServer } from '@angular/common';
import { InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';

export const AUTH = new InjectionToken('AUTH', {
  providedIn: 'root',
  factory: () => {
    const platform = inject(PLATFORM_ID);
    if (isPlatformServer(platform)) {
      return null;
    }

    return inject(AuthService);
  },
});
