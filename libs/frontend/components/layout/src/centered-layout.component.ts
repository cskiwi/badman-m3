import { Component } from '@angular/core';
import { LayoutComponent } from './layout.component';

@Component({
    selector: 'app-centered-layout',
    standalone: true,
    imports: [LayoutComponent],
    templateUrl: './centered-layout.component.html'
})
export class CenterLayoutComponent {}
