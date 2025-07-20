import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { CompetitionEncounter } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';

const UPCOMING_TEAM_GAMES_QUERY = gql`
  query UpcomingTeamGames($teamId: ID!) {
    competitionEncounters(where: { 
      $or: [
        { homeTeamId: $teamId },
        { awayTeamId: $teamId }
      ]
    }) {
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
        const result = await this.apollo
          .query<{ competitionEncounters: CompetitionEncounter[] }>({
            query: UPCOMING_TEAM_GAMES_QUERY,
            variables: { teamId: params.teamId },
            context: { signal: abortSignal },
          })
          .toPromise();

        if (!result?.data?.competitionEncounters) {
          return { games: [], endReached: true };
        }

        let encounters = result.data.competitionEncounters;

        // Filter for upcoming encounters (date >= today)
        const today = moment().startOf('day');
        encounters = encounters.filter((encounter) => encounter.date && moment(encounter.date).isSameOrAfter(today));

        // Sort by date ascending
        encounters = encounters.sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf());

        // Apply pagination
        const page = params.page || 1;
        const startIndex = (page - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedGames = encounters.slice(startIndex, endIndex);

        return { 
          games: paginatedGames, 
          endReached: paginatedGames.length < this.itemsPerPage 
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
