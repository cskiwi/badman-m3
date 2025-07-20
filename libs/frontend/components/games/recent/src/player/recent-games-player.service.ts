import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Game, GamePlayerMembership, Player } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';

const PLAYER_RECENT_GAMES_QUERY = gql`
  query PlayerRecentGames($playerId: ID!, $args: GamePlayerMembershipArgs) {
    player(id: $playerId) {
      id
      gamePlayerMemberships(args: $args) {
        id
        game {
          id
          playedAt
          gameType
          set1Team1
          set1Team2
          set2Team1
          set2Team2
          set3Team1
          set3Team2
          rankingPoints {
            id
            points
            playerId
          }
          tournamentDraw {
            name
            id
            type
            visualCode
            tournamentSubEvent {
              id
              name
              eventType
              gameType
              level
              tournamentEvent {
                id
                name
                tournamentNumber
                official
                visualCode
                state
                country
              }
            }
          }
          competitionEncounter {
            id
            date
            visualCode
            homeTeamId
            awayTeamId
            homeTeam {
              id
              name
              abbreviation
            }
            awayTeam {
              id
              name
              abbreviation
            }
            drawCompetition {
              id
              name
              type
              competitionSubEvent {
                id
                name
                eventType
                level
                competitionEvent {
                  id
                  name
                  season
                  official
                  visualCode
                  type
                  state
                  country
                }
              }
            }
          }
          gamePlayerMemberships {
            id
            player
            single
            team
            mix
            double
            gamePlayer {
              id
              fullName
            }
          }
        }
      }
    }
  }
`;

export class PlayerRecentGamesService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    playerId: new FormControl<string | null>(null),
    skip: new FormControl<number>(0),
    take: new FormControl<number>(10),
  });

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private recentGamesResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.playerId) {
        return [];
      }

      const variables = {
        playerId: params.playerId,
        args: {
          skip: params.skip,
          take: params.take,
          where: {
            game: {
              set1Team1: {
                $gt: 0,
              },
              set1Team2: {
                $gt: 0,
              },
              playedAt: {
                $lte: moment().format('YYYY-MM-DD'),
              },
            },
          },
          order: {
            game: {
              playedAt: 'DESC',
            },
          },
        },
      };

      try {
        const result = await this.apollo
          .query<{ player: Player }>({
            query: PLAYER_RECENT_GAMES_QUERY,
            variables,
            context: { signal: abortSignal },
          })
          .toPromise();

        if (!result?.data.player?.gamePlayerMemberships) {
          throw new Error('No player found');
        }

        const games = result.data.player.gamePlayerMemberships.map((gpm) => gpm.game);
        return games;
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  games = computed(() => this.recentGamesResource.value() ?? []);
  loading = computed(() => this.recentGamesResource.isLoading());
  error = computed(() => this.recentGamesResource.error()?.message || null);
  loadedAndError = computed(() => {
    return !this.loading() && this.error();
  });

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load recent games';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }
}
