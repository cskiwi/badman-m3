import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { Team } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { sortTeams } from '@app/utils/sorts';

export class ClubTeamsTabService {
  private readonly apollo = inject(Apollo);

  private clubId = signal<string | null>(null);
  private season = signal<number | null>(null);

  private teamsResource = resource({
    params: () => ({
      clubId: this.clubId(),
      season: this.season(),
    }),
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId || !params.season) {
        return [];
      }

      try {
        const teamsResult = await lastValueFrom(
          this.apollo.query<{ club: { teams: Team[] } }>({
            query: gql`
              query ClubTeams($clubId: ID!, $season: Float!) {
                club(id: $clubId) {
                  id
                  teams(args: { where: [{ season: { eq: $season } }], take: 50, order: { name: ASC } }) {
                    id
                    name
                    season
                    type
                    abbreviation
                    email
                    phone
                    teamNumber
                    preferredTime
                    preferredDay
                    captain {
                      id
                      fullName
                    }
                    teamPlayerMemberships {
                      id
                      membershipType
                      playerId
                      player {
                        id
                        fullName
                        firstName
                        lastName
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              clubId: params.clubId,
              season: params.season,
            },
            context: { signal: abortSignal },
          }),
        );

        const teams = teamsResult.data.club?.teams || [];
        return [...teams].sort(sortTeams);
      } catch (err) {
        console.error(err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  teams = computed(() => this.teamsResource.value() || []);
  loading = computed(() => this.teamsResource.isLoading());
  error = computed(() => this.teamsResource.error()?.message || null);

  setClubId(clubId: string | null) {
    this.clubId.set(clubId);
  }

  setSeason(season: number | null) {
    this.season.set(season);
  }

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404 && err.url) {
      return 'Failed to load teams';
    }
    return err.statusText || 'An error occurred';
  }
}
