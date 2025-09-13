import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Club } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { debounceTime } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';

interface ClubWithStats extends Club {
  playersCount?: number;
  teamsCount?: number;
}

interface ClubsQueryResponse {
  clubs: ClubWithStats[];
}

export class ClubsService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    query: new FormControl<string | null>(null),
    state: new FormControl<string | null>(null),
    country: new FormControl<string | null>(null),
    minPlayers: new FormControl<number | null>(null),
    maxPlayers: new FormControl<number | null>(null),
    minTeams: new FormControl<number | null>(null),
    maxTeams: new FormControl<number | null>(null),
  });

  // Convert form to signal for resource with debounce
  private filterSignal = toSignal(this.filter.valueChanges.pipe(debounceTime(300)));

  private clubsResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      try {
        const result = await lastValueFrom(this.apollo
          .query<ClubsQueryResponse>({
            query: gql`
              query Clubs($args: ClubArgs) {
                clubs(args: $args) {
                  id
                  name
                  fullName
                  abbreviation
                  slug
                  state
                  country
                  teamName
                  contactCompetition
                  clubPlayerMemberships {
                    id
                    player {
                      id
                    }
                  }
                  teams {
                    id
                    name
                  }
                }
              }
            `,
            variables: {
              args: { 
                where: this._buildWhereClause(params),
                order: [{ name: 'ASC' }]
              },
            },
            context: { signal: abortSignal },
          }));

        if (!result?.data.clubs) {
          throw new Error('No clubs found');
        }

        // Add computed statistics
        const clubsWithStats: ClubWithStats[] = result.data.clubs.map(club => ({
          ...club,
          playersCount: club.clubPlayerMemberships?.length || 0,
          teamsCount: club.teams?.length || 0
        }));

        return clubsWithStats;
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  clubs = computed(() => this.clubsResource.value() ?? []);
  clubStats = computed(() => {
    const clubs = this.clubsResource.value() ?? [];
    return {
      totalClubs: clubs.length,
      totalPlayers: clubs.reduce((sum, club) => sum + (club.playersCount || 0), 0),
      totalTeams: clubs.reduce((sum, club) => sum + (club.teamsCount || 0), 0),
      averagePlayersPerClub: clubs.length > 0 ? Math.round(clubs.reduce((sum, club) => sum + (club.playersCount || 0), 0) / clubs.length) : 0
    };
  });
  error = computed(() => this.clubsResource.error()?.message || null);
  loading = computed(() => this.clubsResource.isLoading());

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load clubs';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }

  private _buildWhereClause(params: any) {
    const where: any = {};

    if (params?.query) {
      const searchTerms = this._parseSearchQuery(params.query);
      if (searchTerms.length > 0) {
        where.OR = [
          ...searchTerms.map(term => ({ name: { ilike: `%${term}%` } })),
          ...searchTerms.map(term => ({ fullName: { ilike: `%${term}%` } })),
          ...searchTerms.map(term => ({ abbreviation: { ilike: `%${term}%` } })),
        ];
      }
    }

    if (params?.state) {
      where.state = { eq: params.state };
    }

    if (params?.country) {
      where.country = { eq: params.country };
    }

    // Note: Player and team count filtering would require more complex GraphQL queries
    // with aggregations. For now, we'll filter on the client side in a real implementation.
    // This is a simplified version for demonstration.

    return Object.keys(where).length > 0 ? where : undefined;
  }

  private _parseSearchQuery(query: string | null | undefined): string[] {
    if (!query) return [];

    return query
      .toLowerCase()
      .replace(/[;\\/:*?"<>|&',]/g, ' ')
      .split(' ')
      .map(part => part.trim())
      .filter(part => part.length > 0);
  }
}
