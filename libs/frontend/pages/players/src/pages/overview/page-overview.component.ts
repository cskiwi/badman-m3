import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { OverviewService } from './page-overview.service';
import { derivedAsync } from 'ngxtension/derived-async';

@Component({
  selector: 'lib-page-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-overview.component.html',
  styleUrl: './page-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageOverviewComponent {
  // private readonly dataService = new OverviewService();
  private readonly apollo = inject(Apollo);

  players = derivedAsync(() =>
    this.apollo.query<{
      me: { id: string; fullName: string };
    }>({
      query: gql`
        query GetPlayersInComponent {
          players {
            id
            slug
            memberId
            fullName
          }
        }
      `,
    }),
  );

  // selectors
  // players = this.dataService.state.players;
}
