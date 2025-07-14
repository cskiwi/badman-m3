import { Component } from '@angular/core';
import { LayoutComponent } from './layout.component';

@Component({
    imports: [LayoutComponent],
    template: ` <app-layout [fullWidth]="false"></app-layout>`
})
export class CenterLayoutComponent {}
