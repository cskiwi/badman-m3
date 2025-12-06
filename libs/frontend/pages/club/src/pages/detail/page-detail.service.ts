import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Club, CompetitionEncounter, Game, Team } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { getSeason } from '@app/utils/comp';
import { sortTeams } from '@app/utils/sorts';

// Extended type for encounters from GraphQL response
type EncounterWithStats = CompetitionEncounter & {
  homeTeam?: { id: string };
  awayTeam?: { id: string };
  games?: (Game & { winner?: number })[];
};

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
        return { teams: [], encounters: [] };
      }

      try {
        // First query: get teams for the club
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
        const teamIds = teams.map(t => t.id);

        // If no teams, return early
        if (teamIds.length === 0) {
          return { teams: [], encounters: [] };
        }

        // Second query: get encounters for these teams
        const encountersResult = await lastValueFrom(
          this.apollo.query<{ competitionEncounters: EncounterWithStats[] }>({
            query: gql`
              query ClubEncounters($teamIds: [String!]!) {
                competitionEncounters(
                  args: { where: [{ OR: [{ homeTeamId: { in: $teamIds } }, { awayTeamId: { in: $teamIds } }] }] }
                ) {
                  id
                  date
                  homeTeamId
                  awayTeamId
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
              teamIds,
            },
            context: { signal: abortSignal },
          }),
        );

        return {
          teams: [...teams].sort(sortTeams),
          encounters: encountersResult.data.competitionEncounters || [],
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
  encounters = computed(() => this.teamsResource.value()?.encounters || []);

  error = computed(() => this.clubResource.error()?.message || null);
  loading = computed(() => this.clubResource.isLoading());
  teamsLoading = computed(() => this.teamsResource.isLoading());
  statsLoading = computed(() => this.teamsResource.isLoading());

  // Team statistics computed from encounters
  teamStats = computed(() => {
    const teams = this.teams();
    const encounters = this.encounters();
    const statsMap = new Map<string, { gamesPlayed: number; wins: number; losses: number }>();

    teams.forEach(team => {
      let gamesPlayed = 0;
      let wins = 0;
      let losses = 0;

      // Find encounters for this team
      const teamEncounters = encounters.filter(
        encounter => encounter.homeTeam?.id === team.id || encounter.awayTeam?.id === team.id,
      );

      teamEncounters.forEach(encounter => {
        if (encounter.games && encounter.games.length > 0) {
          const isHomeTeam = encounter.homeTeam?.id === team.id;

          encounter.games.forEach(game => {
            if (game.winner !== null && game.winner !== undefined) {
              gamesPlayed++;
              // winner: 1 = home team won, 2 = away team won
              if ((isHomeTeam && game.winner === 1) || (!isHomeTeam && game.winner === 2)) {
                wins++;
              } else {
                losses++;
              }
            }
          });
        }
      });

      statsMap.set(team.id, { gamesPlayed, wins, losses });
    });

    return statsMap;
  });

  // Club-wide statistics
  clubStats = computed(() => {
    const teamStatsMap = this.teamStats();
    let totalGames = 0;
    let totalWins = 0;

    teamStatsMap.forEach(stats => {
      totalGames += stats.gamesPlayed;
      totalWins += stats.wins;
    });

    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

    return {
      totalGames,
      winRate,
      averageRanking: null as number | null, // Can be extended later
    };
  });

  getTeamStats(teamId: string) {
    const stats = this.teamStats().get(teamId);
    return stats || { gamesPlayed: 0, wins: 0, losses: 0 };
  }

  getTeamWinRate(teamId: string): number {
    const stats = this.getTeamStats(teamId);
    if (stats.gamesPlayed === 0) return 0;
    return Math.round((stats.wins / stats.gamesPlayed) * 100);
  }

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
