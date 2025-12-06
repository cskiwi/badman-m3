import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

interface GameWithWinner {
  id: string;
  winner: number | null; // 1 = home team, 2 = away team
}

interface EncounterWithGames {
  id: string;
  homeTeam: { id: string } | null;
  awayTeam: { id: string } | null;
  games: GameWithWinner[];
}

export class TeamCardService {
  private readonly apollo = inject(Apollo);

  private teamId = signal<string | null>(null);

  private statsResource = resource({
    params: () => ({
      teamId: this.teamId(),
    }),
    loader: async ({ params, abortSignal }) => {
      if (!params.teamId) {
        return { gamesPlayed: 0, gamesWon: 0, gamesLost: 0 };
      }

      try {
        // Query encounters with games for this specific team
        const result = await lastValueFrom(
          this.apollo.query<{ competitionEncounters: EncounterWithGames[] }>({
            query: gql`
              query TeamGameStats($teamId: String!) {
                competitionEncounters(
                  args: { where: [{ OR: [{ homeTeamId: { eq: $teamId } }, { awayTeamId: { eq: $teamId } }] }] }
                ) {
                  id
                  homeTeam {
                    id
                  }
                  awayTeam {
                    id
                  }
                  games {
                    id
                    winner
                  }
                }
              }
            `,
            variables: {
              teamId: params.teamId,
            },
            context: { signal: abortSignal },
          }),
        );

        const encounters = result.data.competitionEncounters || [];

        let gamesPlayed = 0;
        let gamesWon = 0;
        let gamesLost = 0;

        encounters.forEach(encounter => {
          const isHomeTeam = encounter.homeTeam?.id === params.teamId;

          encounter.games?.forEach(game => {
            // Only count games with valid winner: 1 = home team won, 2 = away team won
            // winner 0 = not determined, winner 3 = draw/special case
            if (game.winner === 1 || game.winner === 2) {
              gamesPlayed++;

              if ((isHomeTeam && game.winner === 1) || (!isHomeTeam && game.winner === 2)) {
                gamesWon++;
              } else {
                gamesLost++;
              }
            }
          });
        });

        return {
          gamesPlayed,
          gamesWon,
          gamesLost,
        };
      } catch (err) {
        console.error('Error fetching team stats:', err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  stats = computed(() => this.statsResource.value() ?? { gamesPlayed: 0, gamesWon: 0, gamesLost: 0 });
  loading = computed(() => this.statsResource.isLoading());
  error = computed(() => this.statsResource.error()?.message || null);

  winRate = computed(() => {
    const s = this.stats();
    if (s.gamesPlayed === 0) return 0;
    return Math.round((s.gamesWon / s.gamesPlayed) * 100);
  });

  setTeamId(teamId: string | null) {
    this.teamId.set(teamId);
  }

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404 && err.url) {
      return 'Failed to load team stats';
    }
    return err.statusText || 'An error occurred';
  }
}
