import { isPlatformBrowser, PlatformLocation } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ISeoConfig } from '../interfaces/seo-config.interface';
import { SEO_CONFIG } from '../seo.module';
import { Player } from '@app/models';

type ISeoMetaData = {
  keywords?: string[];
  author?: string;
  type?: 'article' | 'website';
  image?: string;
} & (
  | {
      seoType: 'generic';
      title?: string;
      description?: string;
    }
  | {
      seoType: 'player';
      player: Player;
    }
);

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private config = inject<ISeoConfig>(SEO_CONFIG);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private platformId = inject<string>(PLATFORM_ID);
  private platformLocation = inject(PlatformLocation);

  async update(data: ISeoMetaData) {
    this.setType('website');

    this.setKeywords(data?.keywords);
    this.setAuthor(data?.author);
    this.setType(data?.type);

    if (this.config.siteName) {
      this.setSiteName(this.config.siteName);
    }

    this.setImage(data?.image);

    switch (data.seoType) {
      case 'generic':
        this.setGeneric(data);
        break;
      case 'player':
        this.setPlayer(data);
        break;
    }

    if (isPlatformBrowser(this.platformId)) {
      // This also works on server side, but generates wrong url
      this.setUrl(this.platformLocation.href);
    }
  }

  setGeneric(data: { title?: string; description?: string; image?: string }) {
    this.setTitle(data?.title);
    this.setDescription(data?.description);

    if (!data.image && data?.title && data?.description) {
      const url = `${this.config.imageEndpoint}/?title=${encodeURIComponent(
        data.title,
      )}&description=${encodeURIComponent(data.description)}`;
      this.setImage(url);
    }
  }

  setPlayer(data: { player: Player }) {
    this.setTitle(`${data.player.fullName} (${data.player.memberId})`);
    this.setDescription(`${data.player.fullName} (${data.player.memberId})`);
    this.setImage(
      `${this.config.imageEndpoint}/?id=${encodeURIComponent(
        data.player.slug,
      )}`,
    );
    this.setMetaTag('name', 'twitter:card', 'summary_large_image');
  }

  setMetaTag(
    attr: 'name' | 'property' | 'itemprop',
    attrValue: string,
    content?: string | undefined,
    selector?: string,
  ) {
    if (content) {
      this.metaService.updateTag({ [attr]: attrValue, content }, selector);
    } else {
      this.metaService.removeTag(`${attr}='${attrValue}'`);
    }
  }

  private setDescription(description?: string): void {
    this.setMetaTag('name', 'description', description);
    this.setMetaTag('name', 'twitter:description', description);
    this.setMetaTag('property', 'og:description', description);
    this.setMetaTag(
      'itemprop',
      'description',
      description,
      `itemprop='description'`,
    );
  }

  private setType(type?: 'article' | 'website'): void {
    this.setMetaTag('property', 'og:type', type);
    this.setMetaTag('name', 'twitter:site', '@badman');
  }

  private setKeywords(keywords?: string | string[]) {
    const wordsAsString =
      keywords instanceof Array ? keywords?.join(',') : keywords;
    this.setMetaTag('name', 'keywords', wordsAsString);
  }

  private setAuthor(author?: string) {
    this.setMetaTag('name', 'author', author);
    this.setMetaTag('name', 'article:author', author);
  }

  private setSiteName(siteName?: string) {
    this.setMetaTag('name', 'og:site_name', siteName);
  }

  private setUrl(url: string): void {
    this.setMetaTag('name', 'og:url', url);
  }

  private setTitle(title?: string): void {
    if (title) {
      this.titleService.setTitle(title);
    }
    this.setMetaTag('name', 'title', title);
    this.setMetaTag('name', 'twitter:title', title);
    this.setMetaTag('name', 'twitter:image:alt', title);
    this.setMetaTag('property', 'og:title', title);
    this.setMetaTag('property', 'og:image:alt', title);
    this.setMetaTag('itemprop', 'name', title, `itemprop='name'`);
  }

  private setImage(url?: string): void {
    this.setMetaTag('name', 'twitter:image:src', url);
    this.setMetaTag('property', 'og:image', url, `itemprop='image'`);
    this.setMetaTag('property', 'og:image:width', '1200');
    this.setMetaTag('property', 'og:image:height', '630');
  }
}
