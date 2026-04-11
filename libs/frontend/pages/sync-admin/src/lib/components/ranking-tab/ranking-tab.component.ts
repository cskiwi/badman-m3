import { Component } from '@angular/core';
import { RankingSystemsOverviewComponent } from '../ranking-systems/ranking-systems-overview.component';

@Component({
  selector: 'app-ranking-tab',
  standalone: true,
  imports: [RankingSystemsOverviewComponent],
  template: `<app-ranking-systems-overview />`,
})
export class RankingTabComponent {}
