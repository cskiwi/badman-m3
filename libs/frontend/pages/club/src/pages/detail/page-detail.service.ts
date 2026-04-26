import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Club, CompetitionEncounter, Game, Team } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { getSeason } from '@app/utils/comp';
import { sortTeams } from '@app/utils/sorts';

export interface ClubSeasonRecord {
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winRate: number;
}

export interface ClubNextHomeMatch {
  id: string;
  date: string | null;
  homeTeam: { id: string; name: string | null } | null;
  awayTeam: { id: string; name: string | null } | null;
}

export interface ClubStatsPayload {
  id: string;
  memberCount: number;
  seasonRecord: ClubSeasonRecord;
  nextHomeMatch: ClubNextHomeMatch | null;
}

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
                  name
                  slug
                  clubId
                  state
                  country
                  distinctSeasons
                }
              }
            `,
            variables: {
              id: params.clubId,
            },
            context: { signal: abortSignal },
          }),
        );

        if (!result?.data?.club) {
          throw new Error('No club found');
        }
        return result.data.club;
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  private clubStatsResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId || params.season == null) {
        return null;
      }
      try {
        const result = await lastValueFrom(
          this.apollo.query<{ club: ClubStatsPayload | null }>({
            query: gql`
              query ClubStats($id: ID!, $season: Int!) {
                club(id: $id) {
                  id
                  memberCount(season: $season)
                  seasonRecord(season: $season) {
                    wins
                    losses
                    draws
                    total
                    winRate
                  }
                  nextHomeMatch(season: $season) {
                    id
                    date
                    homeTeam {
                      id
                      name
                    }
                    awayTeam {
                      id
                      name
                    }
                  }
                }
              }
            `,
            variables: { id: params.clubId, season: params.season },
            context: { signal: abortSignal },
          }),
        );
        return result.data?.club ?? null;
      } catch (err) {
        // Stats are non-critical — log but don't surface as page error.
        console.warn('Club stats query failed', err);
        return null;
      }
    },
  });

  private teamsResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId || !params.season) {
        return { teams: [], encounters: [] };
      }
      try {
        // First query: get teams for the club
        const teamsResult = await lastValueFrom(
          this.apollo.query<{ club: { teams: Team[] } }>({
            query: gql`
              query ClubDetailTeams($clubId: ID!, $season: Float!) {
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
                        slug
                        fullName
                        firstName
                        lastName
                        rankingLastPlaces {
                          id
                          single
                          double
                          mix
                        }
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

        const teams = teamsResult.data?.club?.teams || [];
        const teamIds = teams.map((t) => t.id);

        // If no teams, return early
        if (teamIds.length === 0) {
          return { teams: [], encounters: [] };
        }

        return {
          teams: [...teams].sort(sortTeams),
          encounters: [],
        };
      } catch (err) {
        console.error(err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  club = computed(() => this.clubResource.value());
  teams = computed(() => this.teamsResource.value()?.teams || []);
  stats = computed(() => this.clubStatsResource.value());
  teamCount = computed(() => this.teams().length);

  error = computed(() => this.clubResource.error()?.message || null);
  loading = computed(() => this.clubResource.isLoading());
  teamsLoading = computed(() => this.teamsResource.isLoading());
  statsLoading = computed(() => this.teamsResource.isLoading());

  // Season management
  currentSeason = computed(() => this.filterSignal().season || getSeason());
  availableSeasons = computed(() => {
    const club = this.club();
    const dbSeasons = [...(club?.distinctSeasons || [])];
    const currentSeason = getSeason();

    // If we have seasons from database, use them, otherwise fallback to default range
    if (dbSeasons.length > 0) {
      return [...dbSeasons]
        .sort((a, b) => b - a) // Sort descending (newest first)
        .map((season) => ({ label: `${season}`, value: season }));
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
