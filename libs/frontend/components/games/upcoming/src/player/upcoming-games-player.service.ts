import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { CompetitionEncounter } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { map } from 'rxjs/operators';

const UPCOMING_GAMES_QUERY = gql`
  query UpcomingGames($args: CompetitionEncounterArgs) {
    competitionEncounters(args: $args) {
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

  // Convert specific form controls to signals for targeted resource updates
  private playerIdSignal = toSignal(this.filter.get('playerId')!.valueChanges);
  private teamAndPaginationSignal = toSignal(
    this.filter.valueChanges.pipe(
      map((values) => ({
        teamIds: values.teamIds,
        clubId: values.clubId,
        page: values.page,
      })),
    ),
  );

  // Resource for fetching player team IDs (only triggers on playerId changes)
  private playerTeamsResource = resource({
    params: this.playerIdSignal,
    loader: async ({ params: playerId, abortSignal }) => {
      if (!playerId) {
        return [];
      }

      try {
        const result = await this.apollo
          .query<{ player: { id: string; teamPlayerMemberships: { id: string; team: { id: string } }[] } }>({
            query: PLAYER_TEAMS_QUERY,
            variables: { playerId },
            context: { signal: abortSignal },
          })
          .toPromise();

        if (!result?.data.player?.teamPlayerMemberships) {
          return [];
        }

        const teamIds = result.data.player.teamPlayerMemberships.map((membership) => membership.team.id);

        // Update filter with fetched team IDs without emitting
        this.filter.patchValue({ teamIds }, { emitEvent: false });

        return teamIds;
      } catch {
        return [];
      }
    },
  });

  // Resource for fetching upcoming games (triggers on teamIds/pagination changes)
  private upcomingGamesResource = resource({
    params: computed(() => ({
      ...this.teamAndPaginationSignal(),
      teamIds: this.playerTeamsResource.value() || this.teamAndPaginationSignal()?.teamIds || [],
    })),
    loader: async ({ params, abortSignal }) => {
      const { teamIds, page } = params;

      if (!teamIds || teamIds.length === 0) {
        return { games: [], endReached: true };
      }

      try {
        const where = {
          OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }],
        };

        const result = await this.apollo
          .query<{ competitionEncounters: CompetitionEncounter[] }>({
            query: UPCOMING_GAMES_QUERY,
            variables: {
              args: {
                where,
                take: 10 // Limit to 10 items per page temporarily
              },
            },
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
        const currentPage = page || 1;
        const startIndex = (currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedGames = encounters.slice(startIndex, endIndex);

        return {
          games: paginatedGames,
          endReached: paginatedGames.length < this.itemsPerPage,
        };
      } catch (err) {
        throw new Error(this._handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  games = computed(() => this.upcomingGamesResource.value()?.games ?? []);
  loading = computed(() => this.upcomingGamesResource.isLoading() || this.playerTeamsResource.isLoading());
  error = computed(() => this.upcomingGamesResource.error()?.message || this.playerTeamsResource.error()?.message || null);
  endReached = computed(() => this.upcomingGamesResource.value()?.endReached ?? true);
  page = computed(() => this.filter.get('page')?.value ?? 1);
  teamIds = computed(() => this.playerTeamsResource.value() ?? []);
  hasHomeTeam = computed(() => {
    const games = this.games();
    return games.some((game) => game.homeTeam);
  });

  private _handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load upcoming encounters';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }
}
