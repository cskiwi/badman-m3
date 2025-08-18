
import { Component, OnInit, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { setLanguage } from '@app/frontend-modules-translation';
import { AvaliableLanguages, languages } from '@app/frontend-modules-translation/languages';
import { SsrCookieService } from 'ngx-cookie-service-ssr';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

@Component({
    selector: 'app-language-selection',
    templateUrl: './selection.component.html',
    styleUrls: ['./selection.component.scss'],
    imports: [
    TranslateModule,
    MenuModule,
    ButtonModule
]
})
export class LanguageSelectionComponent implements OnInit {
  public translate = inject(TranslateService);
  public cookieService = inject(SsrCookieService);
  current!: string;
  langs!: AvaliableLanguages[];
  menuItems: MenuItem[] = [];

  ngOnInit(): void {
    this.langs = Object.values(AvaliableLanguages);
    this.current = this.translate.currentLang;
    
    // Build menu items for PrimeNG menu
    this.menuItems = this.langs.map(lang => ({
      label: this.translate.instant('all.settings.languages.' + lang),
      command: () => this.setLang(lang)
    }));
  }

  async setLang(lang: AvaliableLanguages) {
    // Get value from map
    const values = languages.get(lang);
    if (!values) {
      return;
    }

    await setLanguage(values.translate, this.translate, this.cookieService);

    // Store
    this.current = lang;
    localStorage.setItem('translation.language', lang);
  }
}
