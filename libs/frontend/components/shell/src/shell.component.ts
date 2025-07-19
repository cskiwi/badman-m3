import { isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { AuthService } from '@app/frontend-modules-auth/service';
import { ThemeService } from '@app/frontend-modules-theme';
import { IS_MOBILE } from '@app/frontend-utils';
import { ClubMembershipType } from '@app/model/enums';
import { TranslateModule } from '@ngx-translate/core';
import { filter, map } from 'rxjs/operators';
import { SearchComponent } from './components';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { MessageService } from 'primeng/api';
import type { MenuItem } from 'primeng/api';

@Component({
  imports: [RouterModule, TranslateModule, ButtonModule, MenuModule, DividerModule, ToastModule, ToolbarModule, SearchComponent],
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  providers: [MessageService],
})
export class ShellComponent {
  private readonly platformId = inject<string>(PLATFORM_ID);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  isMobile = inject(IS_MOBILE);
  auth = inject(AuthService);
  readonly themeService = inject(ThemeService);

  user = this.auth.state.user;
  sidebarVisible = false;

  // Theme computed properties
  isDarkMode = computed(() => this.themeService.currentTheme() === 'dark');
  themeToggleIcon = computed(() => (this.isDarkMode() ? 'pi pi-sun' : 'pi pi-moon'));
  themeToggleLabel = computed(() => `Toggle ${this.isDarkMode() ? 'light' : 'dark'} mode`);

  // Check if user has admin access
  hasAdminAccess = computed(() => {
    return this.auth.hasAnyPermission?.(['change:job']) ?? false;
  });

  userMenuItems = computed<MenuItem[]>(() => {
    const baseItems: MenuItem[] = [
      {
        label: this.user()?.firstName || 'User',
        disabled: true,
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
        command: () => this.navigateToAdmin(),
      });
      baseItems.push({
        separator: true,
      });
    }

    baseItems.push(
      {
        label: `${this.isDarkMode() ? 'Light' : 'Dark'} Mode`,
        icon: this.themeToggleIcon(),
        command: () => this.toggleTheme(),
      },
      {
        separator: true,
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.logout(),
      },
    );

    return baseItems;
  });

  clubs = computed(() => {
    return (this.user()?.clubPlayerMemberships ?? [])
      .filter((membership) => membership?.active)
      .sort((a, b) => {
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
    this.auth.state.login({
      appState: {
        target: window.location.pathname,
      },
    });
  }

  logout() {
    this.auth.state.logout();
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get isDesktop() {
    return !this.isMobile();
  }

  navigateToAdmin() {
    this.router.navigate(['/admin']);
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
            summary: 'Update Available',
            detail: 'New version available. Click to refresh.',
            life: 0,
            closable: true,
          });
        });
    }
  }
}
