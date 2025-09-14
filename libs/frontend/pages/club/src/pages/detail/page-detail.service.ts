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
                  distinctSeasons
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

        return [...(result.data.club?.teams || [])].sort(sortTeams);
      } catch (err) {
        console.error(err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Mock statistics resource - replace with actual GraphQL queries when available
  private clubStatsResource = resource({
    params: this.filterSignal,
    loader: async ({ params }) => {
      if (!params.clubId) {
        return null;
      }

      // Mock statistics - replace with actual GraphQL query
      return new Promise<any>((resolve) => {
        setTimeout(() => {
          resolve({
            totalGames: Math.floor(Math.random() * 200) + 100,
            wins: Math.floor(Math.random() * 120) + 60,
            losses: Math.floor(Math.random() * 80) + 40,
            draws: Math.floor(Math.random() * 20) + 5,
            winRate: Math.round(Math.random() * 40 + 40),
            averageRanking: Math.floor(Math.random() * 50) + 1,
            seasonsActive: Math.floor(Math.random() * 10) + 5,
            topPlayer: {
              id: '1',
              name: 'John Doe',
              winRate: 85,
              gamesPlayed: 45
            },
            recentForm: [true, true, false, true, true], // W/L for last 5 matches
            monthlyStats: Array.from({ length: 12 }, (_, i) => ({
              month: i + 1,
              games: Math.floor(Math.random() * 15) + 5,
              winRate: Math.round(Math.random() * 40 + 40)
            }))
          });
        }, 500);
      });
    },
  });

  // Public selectors
  club = computed(() => this.clubResource.value());
  teams = computed(() => this.teamsResource.value() || []);
  clubStats = computed(() => this.clubStatsResource.value());

  error = computed(() => this.clubResource.error()?.message || this.teamsResource.error()?.message || this.clubStatsResource.error()?.message || null);
  loading = computed(() => this.clubResource.isLoading());
  teamsLoading = computed(() => this.teamsResource.isLoading());
  statsLoading = computed(() => this.clubStatsResource.isLoading());

  // Season management
  currentSeason = computed(() => this.filter.get('season')?.value || getSeason());
  availableSeasons = computed(() => {
    const club = this.club();
    const dbSeasons = [...club?.distinctSeasons || []];
    const currentSeason = getSeason();
    
    // If we have seasons from database, use them, otherwise fallback to default range
    if (dbSeasons.length > 0) {
      return [...dbSeasons]
        .sort((a, b) => b - a) // Sort descending (newest first)
        .map(season => ({ label: `${season}`, value: season }));
    }
    
    // Fallback to hardcoded range if no seasons in database
    return [
      { label: `${currentSeason - 2}`, value: currentSeason - 2 },
      { label: `${currentSeason - 1}`, value: currentSeason - 1 },
      { label: `${currentSeason}`, value: currentSeason },
      { label: `${currentSeason + 1}`, value: currentSeason + 1 },
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
