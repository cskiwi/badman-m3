import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Display-style heading used inside the `[identity]` slot of `<app-hero>`.
 * Renders an `<h1>` with the project's Space Grotesk display typography.
 */
@Component({
  selector: 'app-hero-title',
  templateUrl: './hero-title.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroTitleComponent {}
