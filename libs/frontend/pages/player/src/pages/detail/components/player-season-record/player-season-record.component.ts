import { ChangeDetectionStrategy, Component, computed, effect, input } from '@angular/core';
import { ChipModule } from 'primeng/chip';
import { PlayerStatsService } from '../player-stats.service';

@Component({
  selector: 'app-player-season-record',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChipModule],
  templateUrl: './player-season-record.component.html',
  styleUrl: './player-season-record.component.scss',
})
export class PlayerSeasonRecordComponent {
  private readonly statsService = new PlayerStatsService();

  readonly playerId = input.required<string>();

  readonly wins = this.statsService.wins;
  readonly losses = this.statsService.losses;
  readonly totalGames = this.statsService.totalGames;
  readonly longestStreak = this.statsService.longestStreak;
  readonly thisMonth = this.statsService.thisMonthRecord;
  readonly winRate = this.statsService.winRate;
  readonly loading = this.statsService.loading;

  readonly winPct = computed(() => (this.totalGames() ? (this.wins() / this.totalGames()) * 100 : 0));
  readonly lossPct = computed(() => (this.totalGames() ? (this.losses() / this.totalGames()) * 100 : 0));

  constructor() {
    effect(() => {
      this.statsService.filter.get('playerId')?.setValue(this.playerId());
    });
  }
}
