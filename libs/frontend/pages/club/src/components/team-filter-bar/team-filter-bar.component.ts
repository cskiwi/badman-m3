import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TeamGenderFilter } from '../../pages/detail/tabs/club-teams-tab.service';

interface BucketCounts {
  all: number;
  M: number;
  F: number;
  MX: number;
}

@Component({
  selector: 'app-team-filter-bar',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './team-filter-bar.component.html',
  styleUrl: './team-filter-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamFilterBarComponent {
  readonly filter = input.required<TeamGenderFilter>();
  readonly counts = input.required<BucketCounts>();

  readonly filterChange = output<TeamGenderFilter>();

  select(filter: TeamGenderFilter) {
    if (filter !== this.filter()) {
      this.filterChange.emit(filter);
    }
  }
}
