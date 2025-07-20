import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { CompetitionEncounter } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';

const UPCOMING_GAMES_QUERY = gql`
  query UpcomingGames {
    competitionEncounters {
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

const PLAYER_TEAMS_QUERY = gql`
  query PlayerTeams($playerId: ID!) {
    player(id: $playerId) {
      id
      teamPlayerMemberships {
        id
        team {
          id
        }
      }
    }
  }
`;


@Injectable({
  providedIn: 'root',
})
export class PlayerUpcommingGamesService {
  private readonly apollo = inject(Apollo);

  itemsPerPage = 10;

  filter = new FormGroup({
    teamIds: new FormControl<string[]>([]),
    clubId: new FormControl<string>(''),
    playerId: new FormControl<string | null>(null),
    page: new FormControl<number>(1),
  });

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private upcomingGamesResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.playerId) {
        return { games: [], endReached: true };
      }

      try {
        // First fetch player team IDs if needed
        let teamIds = params.teamIds || [];
        if (params.playerId && teamIds.length === 0) {
          teamIds = await this._fetchPlayerTeamIds(params.playerId);
          // Update filter with fetched team IDs without emitting
          this.filter.patchValue({ teamIds }, { emitEvent: false });
        }

        const result = await this.apollo
          .query<{ competitionEncounters: CompetitionEncounter[] }>({
            query: UPCOMING_GAMES_QUERY,
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

        // Filter by team IDs if provided
        if (teamIds && teamIds.length > 0) {
          encounters = encounters.filter(
            (encounter) =>
              (encounter.homeTeamId && teamIds.includes(encounter.homeTeamId)) ||
              (encounter.awayTeamId && teamIds.includes(encounter.awayTeamId)),
          );
        }

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
        throw new Error(this._handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  games = computed(() => this.upcomingGamesResource.value()?.games ?? []);
  loading = computed(() => this.upcomingGamesResource.isLoading());
  error = computed(() => this.upcomingGamesResource.error()?.message || null);
  endReached = computed(() => this.upcomingGamesResource.value()?.endReached ?? true);
  page = computed(() => this.filter.get('page')?.value ?? 1);
  hasHomeTeam = computed(() => {
    const games = this.games();
    return games.some(game => game.homeTeam);
  });

  private async _fetchPlayerTeamIds(playerId: string): Promise<string[]> {
    try {
      const result = await this.apollo
        .query<{ player: { id: string; teamPlayerMemberships: { id: string; team: { id: string } }[] } }>({
          query: PLAYER_TEAMS_QUERY,
          variables: { playerId },
        })
        .toPromise();

      if (!result?.data.player?.teamPlayerMemberships) {
        return [];
      }
      return result.data.player.teamPlayerMemberships.map((membership) => membership.team.id);
    } catch {
      return []; // Return empty array on error
    }
  }


  private _handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load upcoming encounters';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }
}
