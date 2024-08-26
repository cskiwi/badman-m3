import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SearchHit, SearchService } from './search.service';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MtxSelectModule,
    MatLabel,
    FormsModule,
    MatFormFieldModule,
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);

  filter = this.searchService.filter;
  results = this.searchService.results;

  search(model: SearchHit) {
    console.log('search', model);

    switch (model.linkType) {
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
    }
  }
}
