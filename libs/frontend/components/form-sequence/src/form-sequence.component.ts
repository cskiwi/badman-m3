import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-form-sequence',
  templateUrl: './form-sequence.component.html',
  styleUrl: './form-sequence.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormSequenceComponent {
  results = input.required<('W' | 'L')[]>();
}
