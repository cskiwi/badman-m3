import { Component, input } from '@angular/core';
import { Game } from '@app/models';
import { KoChart } from '@app/frontend-components/ko-chart';

@Component({
  selector: 'app-draw-ko-tree',
  standalone: true,
  imports: [KoChart],
  template: ` <ko-chart [games]="games()" [standings]="standings()"></ko-chart> `,
})
export class DrawKoTreeComponent {
  standings = input.required<any[]>();
  games = input.required<Game[]>();
}
