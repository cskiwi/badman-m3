import { Component } from '@angular/core';
import { LayoutComponent } from './layout.component';

@Component({
    selector: 'app-full-width-layout',
    standalone: true,
    imports: [LayoutComponent],
    templateUrl: './full-layout.component.html'
})
export class FullWidthLayoutComponent {}
