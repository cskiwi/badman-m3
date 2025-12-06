import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { Game, GamePlayerMembership, Player, Team, TeamPlayerMembership } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { sortTeams } from '@app/utils/sorts';

// Extended type for player with games from GraphQL response
type PlayerWithGames = Player & {
  games?: (Game & {
    winner?: number;
    players?: (GamePlayerMembership & {
      team?: number;
      gamePlayer?: { id: string };
    })[];
  })[];
};

// Extended type for team with player games
type TeamWithPlayerGames = Team & {
  teamPlayerMemberships?: (TeamPlayerMembership & {
    player?: PlayerWithGames;
  })[];
};

// Player with team info for display
type PlayerWithTeam = PlayerWithGames & {
  team: { id: string; name: string; abbreviation?: string };
};

export class ClubPlayersTabService {
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
        const result = await lastValueFrom(
          this.apollo.query<{ club: { teams: TeamWithPlayerGames[] } }>({
            query: gql`
              query ClubTeamsForPlayers($clubId: ID!, $season: Float!) {
                club(id: $clubId) {
                  id
                  teams(args: { where: [{ season: { eq: $season } }], take: 50, order: { name: ASC } }) {
                    id
                    name
                    abbreviation
                    teamPlayerMemberships {
                      id
                      player {
                        id
                        fullName
                        firstName
                        lastName
                        games(args: { take: 100 }) {
                          id
                          winner
                          players: gamePlayerMemberships {
                            id
                            team
                            gamePlayer {
                              id
                            }
                          }
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

        return [...(result.data.club?.teams || [])].sort(sortTeams);
      } catch (err) {
        console.error(err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors - flatten players from teams
  players = computed(() => {
    const teams = this.teamsResource.value() || [];
    const playersWithTeam: PlayerWithTeam[] = [];

    teams.forEach(team => {
      team.teamPlayerMemberships?.forEach(membership => {
        if (membership.player) {
          playersWithTeam.push({
            ...membership.player,
            team: {
              id: team.id,
              name: team.name || '',
              abbreviation: team.abbreviation,
            }
          } as PlayerWithTeam);
        }
      });
    });

    return playersWithTeam;
  });

  // Player statistics computed from games
  playerStats = computed(() => {
    const players = this.players();
    const statsMap = new Map<string, { gamesPlayed: number; wins: number; losses: number }>();

    players.forEach(player => {
      let gamesPlayed = 0;
      let wins = 0;
      let losses = 0;

      player.games?.forEach(game => {
        if (game.winner !== null && game.winner !== undefined) {
          // Find which team the player was on in this game
          const playerInGame = game.players?.find(p => p.gamePlayer?.id === player.id);
          if (playerInGame && playerInGame.team !== undefined) {
            gamesPlayed++;
            // winner: 1 = team 1 won, 2 = team 2 won
            if (playerInGame.team === game.winner) {
              wins++;
            } else {
              losses++;
            }
          }
        }
      });

      statsMap.set(player.id, { gamesPlayed, wins, losses });
    });

    return statsMap;
  });

  loading = computed(() => this.teamsResource.isLoading());
  error = computed(() => this.teamsResource.error()?.message || null);

  getPlayerStats(playerId: string) {
    const stats = this.playerStats().get(playerId);
    return stats || { gamesPlayed: 0, wins: 0, losses: 0 };
  }

  getPlayerWinRate(playerId: string): number {
    const stats = this.getPlayerStats(playerId);
    if (stats.gamesPlayed === 0) return 0;
    return Math.round((stats.wins / stats.gamesPlayed) * 100);
  }

  setClubId(clubId: string | null) {
    this.clubId.set(clubId);
  }

  setSeason(season: number | null) {
    this.season.set(season);
  }

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404 && err.url) {
      return 'Failed to load players';
    }
    return err.statusText || 'An error occurred';
  }
}
