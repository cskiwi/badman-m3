import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lib-page-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-home.component.html',
  styleUrl: './page-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHomeComponent {}
