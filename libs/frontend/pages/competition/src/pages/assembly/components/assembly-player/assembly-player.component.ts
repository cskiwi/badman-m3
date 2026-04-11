import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TooltipModule } from 'primeng/tooltip';
import { PlayerWithRanking } from '../../page-assembly.service';

@Component({
  selector: 'app-assembly-player',
  standalone: true,
  imports: [TranslateModule, TooltipModule],
  templateUrl: './assembly-player.component.html',
  styleUrl: './assembly-player.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssemblyPlayerComponent {
  player = input.required<PlayerWithRanking>();
  eventType = input.required<string>();
  showType = input<string>();
  levelException = input(false);

  ranking = computed(() => {
    const ranking = this.player().rankingLastPlaces?.[0];
    const single = ranking?.single ?? 12;
    const double = ranking?.double ?? 12;
    const mix = ranking?.mix ?? 12;

    if (!this.showType()) {
      if (this.eventType() === 'M' || this.eventType() === 'F') {
        return `${single} - ${double}`;
      }
      return `${single} - ${double} - ${mix}`;
    }

    if (this.showType()?.includes('single')) {
      return `${single}`;
    }
    if (this.eventType() === 'MX' && (this.showType() === 'double3' || this.showType() === 'double4')) {
      return `${mix}`;
    }
    return `${double}`;
  });

  isCompetitionPlayer = computed(() => this.player().competitionPlayer ?? true);
}
