import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { filter, Subject } from 'rxjs';
import { SearchHit, SearchService } from './search.service';

@Component({
    selector: 'app-search',
    imports: [ReactiveFormsModule, MtxSelectModule, FormsModule, MatFormFieldModule, MatSelectModule, NgxMatSelectSearchModule],
    templateUrl: './search.component.html',
    styleUrl: './search.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchComponent {
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);

  selectedCars = [];

  filter = this.searchService.filter;
  results = this.searchService.results;
  loading = this.searchService.loading;

  query = this.filter.get('query') as FormControl;

  typeahead: Subject<string> = new Subject();

  constructor() {
    this.typeahead.pipe(filter((r) => !!r)).subscribe((term) => {
      this.query.patchValue(term);
    });
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
