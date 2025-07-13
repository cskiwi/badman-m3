import { Injectable, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { SsrCookieService } from 'ngx-cookie-service-ssr';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly cookieService = inject(SsrCookieService);
  private readonly platformId = inject(PLATFORM_ID);
  
  private readonly THEME_COOKIE_KEY = 'app-theme';
  private readonly DEFAULT_THEME: Theme = 'light';
  
  // Create a signal for reactive theme management
  private readonly _currentTheme = signal<Theme>(this.getInitialTheme());
  
  // Readonly signal for components to consume
  readonly currentTheme = this._currentTheme.asReadonly();
  
  constructor() {
    // Effect to update document class and save to cookie when theme changes
    effect(() => {
      const theme = this._currentTheme();
      this.updateDocumentTheme(theme);
      this.saveThemeToCookie(theme);
    });
  }
  
  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    const newTheme = this._currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }
  
  /**
   * Set a specific theme
   */
  setTheme(theme: Theme): void {
    this._currentTheme.set(theme);
  }
  
  /**
   * Get the initial theme from cookie or system preference
   */
  private getInitialTheme(): Theme {
    // First check if theme is saved in cookie
    const savedTheme = this.cookieService.get(this.THEME_COOKIE_KEY) as Theme;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      return savedTheme;
    }
    
    // Check system preference if available
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    
    return this.DEFAULT_THEME;
  }
  
  /**
   * Update the document class for theme styling
   */
  private updateDocumentTheme(theme: Theme): void {
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      
      // Remove existing theme classes
      html.classList.remove('light-theme', 'dark-theme');
      
      // Add new theme class
      html.classList.add(`${theme}-theme`);
      
      // Also update data attribute for CSS targeting
      html.setAttribute('data-theme', theme);
    }
  }
  
  /**
   * Save theme preference to cookie
   */
  private saveThemeToCookie(theme: Theme): void {
    this.cookieService.set(this.THEME_COOKIE_KEY, theme, {
      expires: 365, // 1 year
      path: '/',
      sameSite: 'Lax'
    });
  }
}
