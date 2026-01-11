import { Component, input } from '@angular/core';
import { Game } from '@app/models';
import { BracketTree } from '@app/frontend-components/bracket-tree';

@Component({
  selector: 'app-draw-ko-tree',
  standalone: true,
  imports: [BracketTree],
  template: `
    <div class="ko-tree-container">
      <app-bracket-tree [games]="games()" />
    </div>
  `,
  styles: [
    `
      .ko-tree-container {
        display: flex;
        justify-content: center;
        align-items: flex-start;
      }
    `,
  ],
})
export class DrawKoTreeComponent {
  games = input.required<Game[]>();
}
