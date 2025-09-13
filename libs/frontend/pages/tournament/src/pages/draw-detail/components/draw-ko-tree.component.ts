import { Component, input } from '@angular/core';
import { Game } from '@app/models';
import { BracketTree } from '@app/frontend-components/bracket-tree';

@Component({
  selector: 'app-draw-ko-tree',
  standalone: true,
  imports: [BracketTree],
  template: `
    <div class="ko-tree-container">
      <bracket-tree [games]="games()" [standings]="standings()"></bracket-tree>
    </div>
  `,
  styles: [
    `
      .ko-tree-container {
        display: flex;
        justify-content: center;
        align-items: center;
      }
    `,
  ],
})
export class DrawKoTreeComponent {
  standings = input.required<any[]>();
  games = input.required<Game[]>();
}
