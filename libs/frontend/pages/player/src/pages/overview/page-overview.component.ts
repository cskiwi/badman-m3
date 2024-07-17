import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Apollo, TypedDocumentNode, gql } from 'apollo-angular';
import { derivedAsync } from 'ngxtension/derived-async';
import { OverviewService } from './page-overview.service';
import { MatListModule } from '@angular/material/list';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'lib-page-overview',
  standalone: true,
  imports: [CommonModule, MatListModule, RouterLink],
  templateUrl: './page-overview.component.html',
  styleUrl: './page-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageOverviewComponent {
  private readonly dataService = new OverviewService();
 
  // selectors
  players = this.dataService.state.players;
}

