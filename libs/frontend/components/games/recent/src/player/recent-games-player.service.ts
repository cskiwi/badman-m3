import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Game, Player } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { lastValueFrom } from 'rxjs';

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

  // Pagination state
  private allGames = signal<Game[]>([]);
  private isLoadingMore = signal<boolean>(false);
  private hasMoreData = signal<boolean>(true);
  private currentPage = signal<number>(0);
  private pageSize = signal<number>(10);

  filter = new FormGroup({
    playerId: new FormControl<string | null>(null),
    take: new FormControl<number>(10),
    skip: new FormControl<number>(0),
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
                gt: 0,
              },
              set1Team2: {
                gt: 0,
              },
              playedAt: {
                lte: moment().format('YYYY-MM-DD'),
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
        const result = await lastValueFrom(
          this.apollo.query<{ player: Player }>({
            query: PLAYER_RECENT_GAMES_QUERY,
            variables,
            context: { signal: abortSignal },
          }),
        );

        if (!result?.data.player?.gamePlayerMemberships) {
          throw new Error('No player found');
        }

        const games = result.data.player.gamePlayerMemberships.map((gpm) => gpm.game);
        
        // Reset pagination state when loading initial games
        this.resetPagination();
        this.hasMoreData.set(games.length === params.take);
        
        return games;
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  games = computed(() => {
    const initialGames = this.recentGamesResource.value() ?? [];
    const additionalGames = this.allGames();
    // If we have additional games, merge them, otherwise just return initial games
    return additionalGames.length > 0 ? additionalGames : initialGames;
  });
  loading = computed(() => this.recentGamesResource.isLoading());
  loadingMore = computed(() => this.isLoadingMore());
  hasMore = computed(() => this.hasMoreData());
  error = computed(() => this.recentGamesResource.error()?.message || null);
  loadedAndError = computed(() => {
    return !this.loading() && this.error();
  });

  /**
   * Load more games for infinite scroll or load more button
   */
  async loadMore(): Promise<void> {
    const playerId = this.filter.value.playerId;
    if (!playerId || !this.hasMore() || this.loading() || this.loadingMore()) {
      return;
    }

    this.isLoadingMore.set(true);
    
    try {
      const currentGames = this.games();
      const skip = currentGames.length;
      const take = this.pageSize();
      
      const newGames = await this.fetchGames(playerId, skip, take);
      
      // Filter out duplicates and append new games
      const existingIds = new Set(currentGames.map(game => game.id));
      const uniqueNewGames = newGames.filter(game => !existingIds.has(game.id));
      
      this.allGames.set([...currentGames, ...uniqueNewGames]);
      this.hasMoreData.set(newGames.length === take);
      this.currentPage.update(page => page + 1);
    } catch (err) {
      console.error('Failed to load more games:', err);
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  /**
   * Reset pagination state when player changes
   */
  resetPagination(): void {
    this.allGames.set([]);
    this.hasMoreData.set(true);
    this.currentPage.set(0);
    this.isLoadingMore.set(false);
  }

  /**
   * Set page size for pagination
   */
  setPageSize(size: number): void {
    this.pageSize.set(size);
  }

  /**
   * Fetch games from the API
   */
  private async fetchGames(playerId: string, skip: number, take: number): Promise<Game[]> {
    const variables = {
      playerId,
      args: {
        skip,
        take,
        where: {
          game: {
            set1Team1: {
              gt: 0,
            },
            set1Team2: {
              gt: 0,
            },
            playedAt: {
              lte: moment().format('YYYY-MM-DD'),
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

    const result = await lastValueFrom(
      this.apollo.query<{ player: Player }>({
        query: PLAYER_RECENT_GAMES_QUERY,
        variables,
        fetchPolicy: 'network-only', // Always fetch fresh data for pagination
      })
    );

    if (!result?.data.player?.gamePlayerMemberships) {
      throw new Error('No player found');
    }

    return result.data.player.gamePlayerMemberships.map((gpm) => gpm.game);
  }

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load recent games';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }
}
