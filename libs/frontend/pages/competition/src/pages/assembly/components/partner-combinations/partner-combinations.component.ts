import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FieldsetModule } from 'primeng/fieldset';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AssemblyGeneratorService, TimeRange } from '../../assembly-generator.service';

@Component({
  selector: 'app-partner-combinations',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    FieldsetModule,
    SelectModule,
    ButtonModule,
    TooltipModule,
    InputTextModule,
    TableModule,
  ],
  templateUrl: './partner-combinations.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerCombinationsComponent {
  readonly generatorService = inject(AssemblyGeneratorService);

  selectedTimeRange = signal<TimeRange>('both-seasons');
  selectedWeeks = signal(52);

  timeRangeOptions = [
    { label: 'all.competition.team-assembly.auto-generate.both-seasons', value: 'both-seasons' as TimeRange },
    { label: 'all.competition.team-assembly.auto-generate.this-season', value: 'season' as TimeRange },
    { label: 'all.competition.team-assembly.auto-generate.last-season', value: 'last-season' as TimeRange },
    { label: 'all.competition.team-assembly.auto-generate.last-x-weeks', value: 'last-weeks' as TimeRange },
  ];

  async refreshStats(forceRefresh = false) {
    await this.generatorService.loadStats(this.selectedTimeRange(), this.selectedWeeks(), forceRefresh);
  }
}
