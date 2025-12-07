
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { TranslateModule } from '@ngx-translate/core';
import { ClubWithStats, OverviewService } from './page-overview.service';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-page-overview',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    ProgressBarModule,
    InputTextModule,
    FloatLabelModule,
    CardModule,
    SelectModule,
    InputNumberModule,
    ButtonModule,
    TagModule,
    DividerModule,
    PageHeaderComponent
  ],
  templateUrl: './page-overview.component.html',
  styleUrl: './page-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageOverviewComponent {
  private readonly dataService = new OverviewService();

  // selectors
  clubs = this.dataService.clubs;
  clubStats = this.dataService.clubStats;
  
  error = this.dataService.error;
  loading = this.dataService.loading;

  // Form controls
  query = this.dataService.filter.get('query') as FormControl;
  state = this.dataService.filter.get('state') as FormControl;
  country = this.dataService.filter.get('country') as FormControl;
  minPlayers = this.dataService.filter.get('minPlayers') as FormControl;
  maxPlayers = this.dataService.filter.get('maxPlayers') as FormControl;
  minTeams = this.dataService.filter.get('minTeams') as FormControl;
  maxTeams = this.dataService.filter.get('maxTeams') as FormControl;

  // Dropdown options
  stateOptions = [
    { label: 'All States', value: null },
    { label: 'Antwerp', value: 'Antwerp' },
    { label: 'Brussels', value: 'Brussels' },
    { label: 'East Flanders', value: 'East Flanders' },
    { label: 'Flemish Brabant', value: 'Flemish Brabant' },
    { label: 'Hainaut', value: 'Hainaut' },
    { label: 'Liège', value: 'Liège' },
    { label: 'Limburg', value: 'Limburg' },
    { label: 'Luxembourg', value: 'Luxembourg' },
    { label: 'Namur', value: 'Namur' },
    { label: 'Walloon Brabant', value: 'Walloon Brabant' },
    { label: 'West Flanders', value: 'West Flanders' }
  ];

  countryOptions = [
    { label: 'All Countries', value: null },
    { label: 'Belgium', value: 'Belgium' },
    { label: 'Netherlands', value: 'Netherlands' },
    { label: 'France', value: 'France' },
    { label: 'Germany', value: 'Germany' }
  ];

  clearFilters(): void {
    this.dataService.filter.reset();
  }

  getPlayersCountLabel(club: ClubWithStats): string {
    const count = club.playersCount || 0;
    return count === 1 ? '1 player' : `${count} players`;
  }

  getTeamsCountLabel(club: ClubWithStats): string {
    const count = club.teamsCount || 0;
    return count === 1 ? '1 team' : `${count} teams`;
  }
}
