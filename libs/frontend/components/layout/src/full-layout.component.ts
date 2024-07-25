import { Component } from '@angular/core';
import { LayoutComponent } from './layout.component';

@Component({
  standalone: true,
  imports: [LayoutComponent],
  template: ` <app-layout [fullWidth]="true"></app-layout>`,
})
export class FullWidthLayoutComponent {}
