import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BASE_URL } from '@app/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { derivedAsync } from 'ngxtension/derived-async';

@Component({
  selector: 'lib-page-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-home.component.html',
  styleUrl: './page-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHomeComponent {
  private readonly apollo = inject(Apollo);

  exampleFetch = derivedAsync(() =>
    this.apollo.query({
      query: gql`
        query Profile {
          me {
            id
            name
          }
        }
      `,
    }),
  );
}
