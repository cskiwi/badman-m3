import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { Player } from '@app/models';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { PlayersService } from './page-players.service';

@Component({
  selector: 'app-page-players',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    ProgressBarModule,
    InputTextModule,
    InputNumberModule,
    FloatLabelModule,
    CardModule,
    ButtonModule,
    SelectModule,
    TagModule,
    TooltipModule,
    PageHeaderComponent
  ],
  templateUrl: './page-players.component.html',
  styleUrl: './page-players.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PagePlayersComponent {
  private readonly router = inject(Router);
  private readonly dataService = new PlayersService();

  // Public selectors
  players = this.dataService.players;
  error = this.dataService.error;
  loading = this.dataService.loading;

  // Form controls
  queryControl = this.dataService.filter.get('query') as FormControl;
  clubControl = this.dataService.filter.get('clubId') as FormControl;
  minRatingControl = this.dataService.filter.get('minRating') as FormControl;
  maxRatingControl = this.dataService.filter.get('maxRating') as FormControl;
  genderControl = this.dataService.filter.get('gender') as FormControl;
  competitionPlayerControl = this.dataService.filter.get('competitionPlayer') as FormControl;

  // Dropdown options
  genderOptions = [
    { label: 'All Genders', value: undefined },
    { label: 'Male', value: 'M' },
    { label: 'Female', value: 'F' }
  ];

  competitionPlayerOptions = [
    { label: 'All Players', value: undefined },
    { label: 'Competition Players Only', value: true },
    { label: 'Recreational Players Only', value: false }
  ];

  // Computed properties
  filteredPlayersCount = computed(() => this.players().length);

  clearFilters() {
    this.dataService.filter.reset();
  }

  navigateToPlayer(player: Player) {
    // Navigate to player detail page
    this.router.navigate(['/players', player.slug]);
  }

  getPlayerRating(player: Player): number | null {
    return this.dataService.getCurrentRating(player, 'single');
  }

  getPlayerClub(player: Player) {
    return this.dataService.getCurrentClub(player);
  }

  getPlayerAge(player: Player): number | null {
    if (!player.birthDate) return null;
    
    const today = new Date();
    const birthDate = new Date(player.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  getRankingColor(rating: number | null) {
    if (!rating) return 'info';
    
    if (rating >= 1500) return 'success';
    if (rating >= 1200) return 'primary';
    if (rating >= 900) return 'warn';
    return 'secondary';
  }

  formatRating(rating: number | null): string {
    return rating ? rating.toString() : 'Unrated';
  }
}