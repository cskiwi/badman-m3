import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Club, Team } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { getSeason } from '@app/utils/comp';
import { sortTeams } from '@app/utils/sorts';

export class DetailService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    clubId: new FormControl<string | null>(null),
    season: new FormControl<number>(getSeason()),
  });

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges, {
    initialValue: {
      clubId: null,
      season: getSeason(),
    },
  });

  private clubResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId) {
        return null;
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ club: Club }>({
            query: gql`
              query Club($id: ID!) {
                club(id: $id) {
                  id
                  fullName
                  slug
                  clubId
                  teams {
                    id
                    name
                  }
                }
              }
            `,
            variables: {
              id: params.clubId,
            },
            context: { signal: abortSignal },
          }),
        );

        if (!result?.data.club) {
          throw new Error('No club found');
        }
        return result.data.club;
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  private teamsResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId || !params.season) {
        return [];
      }

      try {
        const result = await lastValueFrom(
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

        return [...(result.data.club?.teams || [])].sort(sortTeams);
      } catch (err) {
        console.error(err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  club = computed(() => this.clubResource.value());
  teams = computed(() => this.teamsResource.value() || []);

  error = computed(() => this.clubResource.error()?.message || this.teamsResource.error()?.message || null);
  loading = computed(() => this.clubResource.isLoading());
  teamsLoading = computed(() => this.teamsResource.isLoading());

  // Season management
  currentSeason = computed(() => this.filter.get('season')?.value || getSeason());
  availableSeasons = computed(() => {
    const current = getSeason();
    return [
      { label: `${current - 2}`, value: current - 2 },
      { label: `${current - 1}`, value: current - 1 },
      { label: `${current}`, value: current },
      { label: `${current + 1}`, value: current + 1 },
    ];
  });

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load club';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }
}
