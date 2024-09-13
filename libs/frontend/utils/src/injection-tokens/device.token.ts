import { BreakpointObserver } from '@angular/cdk/layout';
import { InjectionToken, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { NAVIGATOR } from './navigator.token';

export const IS_MOBILE = new InjectionToken('DEVICE', {
  providedIn: 'root',
  factory: () => {
    const platformId = inject(PLATFORM_ID);
    const breakpointObserver = inject(BreakpointObserver);

    if (isPlatformServer(platformId)) {
      const navigator = inject(NAVIGATOR);
      const isMoileNavigator =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
          navigator,
        );
      return signal(isMoileNavigator);
    } else {
      // Fallback to the client-side breakpoint observer for responsiveness
      return toSignal(
        breakpointObserver
          .observe(['(max-width: 959.98px)'])
          .pipe(map((result) => result.matches)),
      );
    }
  },
});
