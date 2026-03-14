import { Component, input } from '@angular/core';
import { Game } from '@app/models';
import { BracketTree } from '@app/frontend-components/bracket-tree';

@Component({
  selector: 'app-draw-ko-tree',
  standalone: true,
  imports: [BracketTree],
  templateUrl: './draw-ko-tree.component.html',
})
export class DrawKoTreeComponent {
  games = input.required<Game[]>();
}
