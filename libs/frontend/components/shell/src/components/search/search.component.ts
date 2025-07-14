import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { SearchHit, SearchService } from './search.service';

@Component({
  selector: 'app-search',
  imports: [FormsModule, AutoCompleteModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);

  results = this.searchService.results;
  loading = this.searchService.loading;

  searchValue = '';

  onSearch(event: { query: string }) {
    const query = event.query || '';
    this.searchValue = query;
    this.searchService.updateQuery(query);
  }

  onSelect(event: AutoCompleteSelectEvent) {
    const model = event.value as SearchHit;
    this.select(model);
  }

  select(model: SearchHit) {
    switch (model?.linkType) {
      case 'player':
        this.router.navigate(['/player', model.linkId]);
        break;
      case 'team':
        this.router.navigate(['/team', model.linkId]);
        break;
      case 'club':
        this.router.navigate(['/club', model.linkId]);
        break;
      case 'competition':
        this.router.navigate(['/competition', model.linkId]);
        break;
      case 'tournament':
        this.router.navigate(['/tournament', model.linkId]);
        break;
      default:
        break;
    }
  }

  getIconClass(linkType: string): string {
    switch (linkType) {
      case 'player':
        return 'pi pi-user';
      case 'team':
        return 'pi pi-users';
      case 'club':
        return 'pi pi-building';
      case 'competition':
      case 'tournament':
      case 'event':
        return 'pi pi-trophy';
      default:
        return 'pi pi-search';
    }
  }

  getIconColor(linkType: string): string {
    switch (linkType) {
      case 'player':
        return '#3b82f6'; // blue
      case 'team':
        return '#10b981'; // green
      case 'club':
        return '#8b5cf6'; // purple
      case 'competition':
      case 'tournament':
      case 'event':
        return '#f59e0b'; // yellow/gold
      default:
        return '#6b7280'; // gray
    }
  }

  getTypeLabel(linkType: string): string {
    switch (linkType) {
      case 'player':
        return 'Player';
      case 'team':
        return 'Team';
      case 'club':
        return 'Club';
      case 'competition':
        return 'Competition';
      case 'tournament':
        return 'Tournament';
      case 'event':
        return 'Event';
      default:
        return 'Result';
    }
  }
}
