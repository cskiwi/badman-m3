import { isPlatformBrowser } from '@angular/common';
import { Component, computed, HostListener, inject, PLATFORM_ID, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { AuthService } from '@app/frontend-modules-auth/service';
import { ThemeService } from '@app/frontend-modules-theme';
import { setLanguage } from '@app/frontend-modules-translation';
import { AvaliableLanguages, languages } from '@app/frontend-modules-translation/languages';
import { IS_MOBILE } from '@app/frontend-utils';
import { ClubMembershipType } from '@app/models-enum';
import { ClubPlayerMembership } from '@app/models';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SsrCookieService } from 'ngx-cookie-service-ssr';
import type { MenuItem } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { filter, map } from 'rxjs/operators';
import { SearchComponent } from './components';

@Component({
  imports: [RouterModule, TranslateModule, ButtonModule, MenuModule, DividerModule, ToastModule, ToolbarModule, SearchComponent],
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  providers: [MessageService],
})
export class ShellComponent {
  private readonly platformId = inject<string>(PLATFORM_ID);
  readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly cookieService = inject(SsrCookieService);

  isMobile = inject(IS_MOBILE);
  auth = inject(AuthService);
  readonly themeService = inject(ThemeService);

  user = this.auth.user;
  sidebarVisible = false;
  isScrolled = signal(false);
  currentLanguage = signal(this.translate.currentLang);

  // Theme computed properties
  isDarkMode = computed(() => this.themeService.currentTheme() === 'dark');
  themeToggleIcon = computed(() => (this.isDarkMode() ? 'pi pi-sun' : 'pi pi-moon'));
  themeToggleLabel = computed(() => `Toggle ${this.isDarkMode() ? 'light' : 'dark'} mode`);

  // Check if user has admin access
  hasAdminAccess = computed(() => {
    return this.auth.hasAnyPermission?.(['change:job']) ?? false;
  });

  userMenuItems = computed<MenuItem[]>(() => {
    const currentLang = this.currentLanguage();
    const isDark = this.isDarkMode();

    const baseItems: MenuItem[] = [
      {
        label: this.user()?.firstName || 'User',
        disabled: true,
        icon: 'pi pi-user',
      },
      {
        separator: true,
      },
    ];

    // Add admin menu item if user has access
    if (this.hasAdminAccess()) {
      baseItems.push({
        label: 'Admin Panel',
        icon: 'pi pi-shield',
        command: (event) => {
          this.navigateToAdmin();
        },
      });
      baseItems.push({
        separator: true,
      });
    }

    // Add language selection for both desktop and mobile - as individual items
    baseItems.push({
      label: this.translate.instant('all.settings.languages.title') || 'Language',
      icon: 'pi pi-globe',
      disabled: true,
    });

    Object.values(AvaliableLanguages).forEach((lang) => {
      baseItems.push({
        label: this.translate.instant('all.settings.languages.' + lang),
        icon: currentLang === lang ? 'pi pi-check' : 'pi pi-circle',
        command: (event) => {
          this.setLanguage(lang);
        },
        styleClass: 'ml-4', // Indent language options
      });
    });

    baseItems.push({
      separator: true,
    });

    baseItems.push(
      {
        label: `${isDark ? 'Light' : 'Dark'} Mode`,
        icon: isDark ? 'pi pi-sun' : 'pi pi-moon',
        command: (event) => {
          this.toggleTheme();
        },
      },
      {
        separator: true,
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: (event) => {
          this.logout();
        },
      },
    );

    return baseItems;
  });

  clubs = computed(() => {
    return [...(this.user()?.clubPlayerMemberships ?? [])]
      .filter((membership: ClubPlayerMembership) => membership?.active)
      .sort((a: ClubPlayerMembership, b: ClubPlayerMembership) => {
        // sort by membership type, first normal then loan
        if (a?.membershipType === b?.membershipType) {
          return 0;
        }

        if (a?.membershipType === ClubMembershipType.NORMAL) {
          return -1;
        }

        if (b?.membershipType === ClubMembershipType.NORMAL) {
          return 1;
        }

        return 0;
      });
  });

  login() {
    this.auth.login({
      appState: {
        target: window.location.pathname,
      },
    });
  }

  logout() {
    this.auth.logout();
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  async setLanguage(lang: AvaliableLanguages) {
    const values = languages.get(lang);
    if (!values) {
      return;
    }

    await setLanguage(values.translate, this.translate, this.cookieService);
    this.currentLanguage.set(lang);
    localStorage.setItem('translation.language', lang);
  }

  get isDesktop() {
    return !this.isMobile();
  }

  navigateToAdmin() {
    this.router.navigate(['/admin']);
  }


  refreshApp() {
    if (isPlatformBrowser(this.platformId)) {
      window.location.reload();
    }
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    if (isPlatformBrowser(this.platformId)) {
      this.isScrolled.set(window.scrollY > 10);
    }
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const updates = inject(SwUpdate);

      updates.versionUpdates
        .pipe(
          filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
          map((evt) => ({
            type: 'UPDATE_AVAILABLE',
            current: evt.currentVersion,
            available: evt.latestVersion,
          })),
        )
        .subscribe(() => {
          this.messageService.add({
            severity: 'info',
            summary: 'all.system.update.available',
            detail: 'all.system.update.description',
            data: {
              showRefreshButton: true,
            },
          });
        });
    }
  }
}
