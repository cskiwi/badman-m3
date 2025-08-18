import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { CompetitionEncounter } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import dayjs from 'dayjs';
import { lastValueFrom } from 'rxjs';

const UPCOMING_TEAM_GAMES_QUERY = gql`
  query UpcomingTeamGames($teamId: ID!, $today: String!) {
    competitionEncounters(where: { AND: [{ date: { gte: $today } }, { OR: [{ homeTeamId: $teamId }, { awayTeamId: $teamId }] }] }) {
      id
      date
      drawCompetition {
        id
      }
      homeTeam {
        id
        name
        abbreviation
        slug
      }
      awayTeam {
        id
        name
        abbreviation
        slug
      }
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class UpcomingGamesTeamService {
  private readonly apollo = inject(Apollo);

  itemsPerPage = 10;

  filter = new FormGroup({
    teamId: new FormControl<string | null>(null),
    page: new FormControl<number>(1),
  });

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private upcomingGamesResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.teamId) {
        return { games: [], endReached: true };
      }

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        const result = await lastValueFrom(
          this.apollo.query<{ competitionEncounters: CompetitionEncounter[] }>({
            query: UPCOMING_TEAM_GAMES_QUERY,
            variables: {
              teamId: params.teamId,
              today: today.toISOString(),
            },
            context: { signal: abortSignal },
          }),
        );

        if (!result?.data?.competitionEncounters) {
          return { games: [], endReached: true };
        }

        // Sort by date ascending
        const encounters = [...result.data.competitionEncounters].sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

        // Apply pagination
        const page = params.page || 1;
        const startIndex = (page - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedGames = encounters.slice(startIndex, endIndex);

        return {
          games: paginatedGames,
          endReached: paginatedGames.length < this.itemsPerPage,
        };
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  games = computed(() => this.upcomingGamesResource.value()?.games ?? []);
  loading = computed(() => this.upcomingGamesResource.isLoading());
  error = computed(() => this.upcomingGamesResource.error()?.message || null);
  endReached = computed(() => this.upcomingGamesResource.value()?.endReached ?? true);
  page = computed(() => this.filter.get('page')?.value ?? 1);

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load upcoming encounters';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }
}
