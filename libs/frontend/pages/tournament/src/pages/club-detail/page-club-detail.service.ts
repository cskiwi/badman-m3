import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Club, Team, Player, Game } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { getSeason } from '@app/utils/comp';

export class ClubDetailService {
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

  // Club basic info resource
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
              query ClubDetail($id: ID!) {
                club(id: $id) {
                  id
                  name
                  fullName
                  slug
                  abbreviation
                  clubId
                  state
                  country
                  contactCompetition
                  distinctSeasons
                  createdAt
                  updatedAt
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

  // Teams with player memberships resource
  private teamsResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId) {
        return [];
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ club: { teams: Team[] } }>({
            query: gql`
              query ClubTeamsDetail($clubId: ID!, $season: Float) {
                club(id: $clubId) {
                  id
                  teams(args: { 
                    where: [{ season: { eq: $season } }], 
                    take: 100, 
                    order: { name: ASC } 
                  }) {
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
                      firstName
                      lastName
                    }
                    teamPlayerMemberships {
                      id
                      membershipType
                      playerId
                      startDate
                      endDate
                      player {
                        id
                        fullName
                        firstName
                        lastName
                        slug
                        gender
                        competitivePlayerIndex
                        subEvents {
                          id
                          level
                          eventType
                        }
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              clubId: params.clubId,
              ...(params.season && { season: params.season }),
            },
            context: { signal: abortSignal },
          }),
        );

        return result.data.club?.teams || [];
      } catch (err) {
        console.error(err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Tournament history resource
  private tournamentHistoryResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId) {
        return [];
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ club: { teams: Team[] } }>({
            query: gql`
              query ClubTournamentHistory($clubId: ID!) {
                club(id: $clubId) {
                  id
                  teams {
                    id
                    name
                    season
                    entries {
                      id
                      subEventTournament {
                        id
                        name
                        eventType
                        level
                        drawTournaments {
                          id
                          name
                          type
                          size
                          tournamentEvent {
                            id
                            name
                            slug
                            firstDay
                            state
                            country
                          }
                        }
                      }
                      standing {
                        id
                        position
                        played
                        points
                        won
                        lost
                        gamesWon
                        gamesLost
                        setsWon
                        setsLost
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              clubId: params.clubId,
            },
            context: { signal: abortSignal },
          }),
        );

        return result.data.club?.teams || [];
      } catch (err) {
        console.error(err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Club statistics resource
  private statisticsResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId) {
        return null;
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ club: any }>({
            query: gql`
              query ClubStatistics($clubId: ID!, $season: Float) {
                club(id: $clubId) {
                  id
                  teams(args: { where: [{ season: { eq: $season } }] }) {
                    id
                    games {
                      id
                      status
                      winner
                      playedAt
                      sets {
                        id
                        set1Team1
                        set1Team2
                        set2Team1
                        set2Team2
                        set3Team1
                        set3Team2
                      }
                      players {
                        id
                        team
                        player {
                          id
                          fullName
                        }
                      }
                    }
                    teamPlayerMemberships {
                      id
                      player {
                        id
                        fullName
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              clubId: params.clubId,
              ...(params.season && { season: params.season }),
            },
            context: { signal: abortSignal },
          }),
        );

        const teams = result.data.club?.teams || [];
        return this.calculateStatistics(teams);
      } catch (err) {
        console.error(err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  club = computed(() => this.clubResource.value());
  teams = computed(() => this.teamsResource.value() || []);
  tournamentHistory = computed(() => this.tournamentHistoryResource.value() || []);
  statistics = computed(() => this.statisticsResource.value());

  // Computed player roster
  playerRoster = computed(() => {
    const teams = this.teams();
    const playerMap = new Map();

    teams.forEach(team => {
      team.teamPlayerMemberships?.forEach(membership => {
        if (membership.player) {
          const playerId = membership.player.id;
          if (!playerMap.has(playerId)) {
            playerMap.set(playerId, {
              ...membership.player,
              teams: [{
                id: team.id,
                name: team.name,
                season: team.season,
                membershipType: membership.membershipType,
                startDate: membership.start,
                endDate: membership.end,
              }],
            });
          } else {
            playerMap.get(playerId).teams.push({
              id: team.id,
              name: team.name,
              season: team.season,
              membershipType: membership.membershipType,
              startDate: membership.start,
              endDate: membership.end,
            });
          }
        }
      });
    });

    return Array.from(playerMap.values()).sort((a, b) => 
      a.fullName.localeCompare(b.fullName)
    );
  });

  // Tournament entries with results
  tournamentEntries = computed(() => {
    const history = this.tournamentHistory();
    const entries: any[] = [];

    history.forEach(team => {
      team.entries?.forEach(entry => {
        if (entry.tournamentSubEvent) {
          entries.push({
            team,
            entry,
            tournament: entry.tournamentSubEvent,
            standing: entry.standing,
            drawTournaments: entry.tournamentSubEvent.drawTournaments || [],
          });
        }
      });
    });

    return entries.sort((a, b) => {
      const aDate = new Date(a.tournament?.drawTournaments?.[0]?.tournamentEvent?.firstDay || 0);
      const bDate = new Date(b.tournament?.drawTournaments?.[0]?.tournamentEvent?.firstDay || 0);
      return bDate.getTime() - aDate.getTime(); // Newest first
    });
  });

  error = computed(() => 
    this.clubResource.error()?.message || 
    this.teamsResource.error()?.message || 
    this.tournamentHistoryResource.error()?.message ||
    this.statisticsResource.error()?.message || 
    null
  );
  
  loading = computed(() => 
    this.clubResource.isLoading() ||
    this.teamsResource.isLoading() ||
    this.tournamentHistoryResource.isLoading() ||
    this.statisticsResource.isLoading()
  );

  // Season management
  currentSeason = computed(() => this.filter.get('season')?.value || getSeason());
  availableSeasons = computed(() => {
    const club = this.club();
    const dbSeasons = [...club?.distinctSeasons || []];
    const currentSeason = getSeason();
    
    if (dbSeasons.length > 0) {
      return [...dbSeasons]
        .sort((a, b) => b - a)
        .map(season => ({ label: `${season}`, value: season }));
    }
    
    return [
      { label: `${currentSeason - 2}`, value: currentSeason - 2 },
      { label: `${currentSeason - 1}`, value: currentSeason - 1 },
      { label: `${currentSeason}`, value: currentSeason },
      { label: `${currentSeason + 1}`, value: currentSeason + 1 },
    ];
  });

  private calculateStatistics(teams: any[]) {
    const stats = {
      totalTeams: teams.length,
      totalPlayers: 0,
      totalGames: 0,
      gamesWon: 0,
      gamesLost: 0,
      setsWon: 0,
      setsLost: 0,
      winPercentage: 0,
      activePlayers: 0,
      tournaments: new Set(),
    };

    const uniquePlayers = new Set();
    const currentSeason = getSeason();

    teams.forEach(team => {
      // Count unique players
      team.teamPlayerMemberships?.forEach((membership: any) => {
        if (membership.player) {
          uniquePlayers.add(membership.player.id);
          if (team.season === currentSeason) {
            stats.activePlayers++;
          }
        }
      });

      // Count games and performance
      team.games?.forEach((game: any) => {
        stats.totalGames++;
        
        if (game.status === 'completed' && game.sets?.length > 0) {
          const isWinner = game.winner === team.id;
          if (isWinner) {
            stats.gamesWon++;
          } else {
            stats.gamesLost++;
          }

          // Count sets
          game.sets.forEach((set: any) => {
            const team1Score = (set.set1Team1 || 0) + (set.set2Team1 || 0) + (set.set3Team1 || 0);
            const team2Score = (set.set1Team2 || 0) + (set.set2Team2 || 0) + (set.set3Team2 || 0);
            
            if (team1Score > team2Score) {
              stats.setsWon++;
            } else {
              stats.setsLost++;
            }
          });
        }
      });
    });

    stats.totalPlayers = uniquePlayers.size;
    stats.winPercentage = stats.totalGames > 0 ? 
      Math.round((stats.gamesWon / stats.totalGames) * 100) : 0;

    return stats;
  }

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404 && err.url) {
      return 'Failed to load club details';
    }
    return err.statusText || 'An error occurred';
  }
}
