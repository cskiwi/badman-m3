import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SparkBar } from './sparkline.model';

@Component({
  selector: 'app-sparkline',
  templateUrl: './sparkline.component.html',
  styleUrl: './sparkline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SparklineComponent {
  bars = input.required<SparkBar[]>();
}
