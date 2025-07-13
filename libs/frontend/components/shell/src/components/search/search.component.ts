import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { filter, Subject } from 'rxjs';
import { SearchHit, SearchService } from './search.service';

@Component({
    selector: 'app-search',
    imports: [ReactiveFormsModule, FormsModule, AutoCompleteModule],
    templateUrl: './search.component.html',
    styleUrl: './search.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchComponent {
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);

  filter = this.searchService.filter;
  results = this.searchService.results;
  loading = this.searchService.loading;

  query = this.filter.get('query') as FormControl;
  filteredResults: SearchHit[] = [];
  searchValue = '';

  typeahead: Subject<string> = new Subject();

  constructor() {
    this.typeahead.pipe(filter((r) => !!r)).subscribe((term) => {
      this.query.patchValue(term);
    });
  }

  onSearch(event: { query: string }) {
    const query = event.query || '';
    this.searchValue = query;
    this.typeahead.next(query);
    this.filteredResults = this.results() || [];
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
}
