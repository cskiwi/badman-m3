import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-draw-standings-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './draw-standings-table.component.html'
})
export class DrawStandingsTableComponent {
  standings = input.required<any[]>();
}