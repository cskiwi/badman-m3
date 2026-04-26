import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';

/**
 * Thin wrapper around PrimeNG's `<p-breadcrumb>` that applies the project's
 * standard home item and styling. Pass an array of `MenuItem`s via `[items]`.
 *
 * @example
 * <app-breadcrumb [items]="[{ label: club.name }]" />
 */
@Component({
  selector: 'app-breadcrumb',
  imports: [BreadcrumbModule],
  templateUrl: './breadcrumb.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
  readonly items = input<MenuItem[]>([]);

  readonly home: MenuItem = {
    icon: 'pi pi-home',
    routerLink: '/',
  };
}
