import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recent-games',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-games.component.html',
  styleUrl: './recent-games.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentGamesComponent {}
