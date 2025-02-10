import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { setLanguage } from '@app/frontend-modules-translation';
import { AvaliableLanguages, languages } from '@app/frontend-modules-translation/languages';
import { SsrCookieService } from 'ngx-cookie-service-ssr';

@Component({
    selector: 'app-language-selection',
    templateUrl: './selection.component.html',
    styleUrls: ['./selection.component.scss'],
    imports: [
        CommonModule,
        TranslateModule,
        MatMenuModule,
        MatButtonModule,
        MatIconModule,
    ]
})
export class LanguageSelectionComponent implements OnInit {
  public translate = inject(TranslateService);
  public cookieService = inject(SsrCookieService);
  // private _adapter = inject<DateAdapter<MomentDateAdapter>>(DateAdapter<MomentDateAdapter>);
  current!: string;
  langs!: AvaliableLanguages[];

  ngOnInit(): void {
    this.langs = Object.values(AvaliableLanguages);
    this.current = this.translate.currentLang;
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
