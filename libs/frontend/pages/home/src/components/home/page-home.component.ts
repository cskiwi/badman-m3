import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TypedDocumentNode } from '@apollo/client/core';
import { Apollo } from 'apollo-angular';

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
      query: `
        query Profile {
          me {
            id
            name
          }
        }
      ` as unknown as TypedDocumentNode,
    }),
  );
}
