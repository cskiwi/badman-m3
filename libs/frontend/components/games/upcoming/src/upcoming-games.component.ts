import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upcoming-games',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upcoming-games.component.html',
  styleUrl: './upcoming-games.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingGamesComponent {}
