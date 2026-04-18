import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, resource } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export interface ClubTopPerformerRow {
  player: {
    id: string;
    slug: string;
    fullName: string;
  };
  wins: number;
  total: number;
  winRate: number;
}

@Component({
  selector: 'app-club-top-performers-card',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './club-top-performers-card.component.html',
  styleUrl: './club-top-performers-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubTopPerformersCardComponent {
  private readonly apollo = inject(Apollo);

  readonly clubId = input.required<string | null>();
  readonly season = input.required<number | null>();
  readonly take = input<number>(5);
  readonly minGames = input<number>(3);

  private readonly dataResource = resource({
    params: () => ({
      clubId: this.clubId(),
      season: this.season(),
      take: this.take(),
      minGames: this.minGames(),
    }),
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId || params.season == null) return [];
      try {
        const result = await lastValueFrom(
          this.apollo.query<{ club: { topPerformers: ClubTopPerformerRow[] } | null }>({
            query: gql`
              query ClubTopPerformers($id: ID!, $season: Int!, $take: Int!, $minGames: Int!) {
                club(id: $id) {
                  id
                  topPerformers(season: $season, take: $take, minGames: $minGames) {
                    wins
                    total
                    winRate
                    player {
                      id
                      slug
                      fullName
                    }
                  }
                }
              }
            `,
            variables: {
              id: params.clubId,
              season: params.season,
              take: params.take,
              minGames: params.minGames,
            },
            context: { signal: abortSignal },
          }),
        );
        return result.data?.club?.topPerformers ?? [];
      } catch (err) {
        console.warn('Top performers card query failed', err as HttpErrorResponse);
        return [];
      }
    },
  });

  readonly rows = computed(() =>
    (this.dataResource.value() ?? []).map((r) => ({
      id: r.player.id,
      slug: r.player.slug ?? r.player.id,
      fullName: r.player.fullName ?? '',
      wins: r.wins,
      losses: Math.max(0, r.total - r.wins),
      total: r.total,
      winRatePct: Math.round(r.winRate * 100),
    })),
  );

  readonly loading = computed(() => this.dataResource.isLoading());
}
