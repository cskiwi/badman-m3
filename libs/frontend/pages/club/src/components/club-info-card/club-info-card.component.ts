import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, resource } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export interface ClubInfoPayload {
  id: string;
  clubId: number | null;
  state: string | null;
  country: string | null;
  fullName: string | null;
  name: string | null;
}

@Component({
  selector: 'app-club-info-card',
  standalone: true,
  imports: [],
  templateUrl: './club-info-card.component.html',
  styleUrl: './club-info-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubInfoCardComponent {
  private readonly apollo = inject(Apollo);

  readonly clubId = input.required<string | null>();
  readonly season = input<number | null>(null);

  private readonly dataResource = resource({
    params: () => ({ clubId: this.clubId() }),
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId) return null;
      try {
        const result = await lastValueFrom(
          this.apollo.query<{ club: ClubInfoPayload | null }>({
            query: gql`
              query ClubInfoCard($id: ID!) {
                club(id: $id) {
                  id
                  clubId
                  state
                  country
                  fullName
                  name
                }
              }
            `,
            variables: { id: params.clubId },
            context: { signal: abortSignal },
          }),
        );
        return result.data?.club ?? null;
      } catch (err) {
        console.warn('Club info card query failed', err as HttpErrorResponse);
        return null;
      }
    },
  });

  readonly club = computed(() => this.dataResource.value() ?? null);
  readonly loading = computed(() => this.dataResource.isLoading());

  readonly seasonLabel = computed(() => {
    const s = this.season();
    return s != null ? `${s} – ${s + 1}` : '–';
  });
}
