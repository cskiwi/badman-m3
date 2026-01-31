import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Game } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

const TEAM_RECENT_GAMES_QUERY = gql`
  query TeamRecentGames($teamIds: [String!]!) {
    competitionEncounters(args: { where: [{ OR: [{ homeTeamId: { in: $teamIds } }, { awayTeamId: { in: $teamIds } }] }] }) {
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
      games {
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
`;

export class TeamRecentGamesService {
  private readonly apollo = inject(Apollo);

  // Pagination state
  private allGames = signal<Game[]>([]);
  private isLoadingMore = signal<boolean>(false);
  private hasMoreData = signal<boolean>(true);
  private currentPage = signal<number>(0);
  private pageSize = signal<number>(10);

  filter = new FormGroup({
    teamIds: new FormControl<string[]>([]),
    take: new FormControl<number>(10),
    skip: new FormControl<number>(0),
  });

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private recentGamesResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.teamIds || params.teamIds.length === 0) {
        return [];
      }

      const variables = {
        teamIds: params.teamIds,
        args: {
          skip: params.skip,
          take: params.take,
        },
      };

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ competitionEncounters: any[] }>({
            query: TEAM_RECENT_GAMES_QUERY,
            variables,
            context: { signal: abortSignal },
          }),
        );

        if (!result?.data?.competitionEncounters) {
          return [];
        }

        // Extract unique games from all encounters
        const allGames = new Map<string, any>();
        result.data.competitionEncounters.forEach((encounter: any) => {
          encounter.games?.forEach((game: any) => {
            if (game && !allGames.has(game.id)) {
              // Add encounter data to game for easier access in the component
              const gameWithEncounter = {
                ...game,
                competitionEncounter: {
                  id: encounter.id,
                  date: encounter.date,
                  visualCode: encounter.visualCode,
                  homeTeamId: encounter.homeTeamId,
                  awayTeamId: encounter.awayTeamId,
                  homeTeam: encounter.homeTeam,
                  awayTeam: encounter.awayTeam,
                  drawCompetition: encounter.drawCompetition,
                },
              };
              allGames.set(game.id, gameWithEncounter);
            }
          });
        });

        const games = Array.from(allGames.values())
          .filter((game) => {
            // Filter played games
            return (
              game.set1Team1 && game.set1Team1 > 0 && game.set1Team2 && game.set1Team2 > 0 && game.playedAt && new Date(game.playedAt) <= new Date()
            );
          })
          .sort((a, b) => {
            const dateA = a.playedAt ? new Date(a.playedAt).getTime() : 0;
            const dateB = b.playedAt ? new Date(b.playedAt).getTime() : 0;
            return dateB - dateA;
          });

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
    const teamIds = this.filter.value.teamIds;
    if (!teamIds || teamIds.length === 0 || !this.hasMore() || this.loading() || this.loadingMore()) {
      return;
    }

    this.isLoadingMore.set(true);

    try {
      const currentGames = this.games();
      const skip = currentGames.length;
      const take = this.pageSize();

      const newGames = await this.fetchGames(teamIds, skip, take);

      // Filter out duplicates and append new games
      const existingIds = new Set(currentGames.map((game) => game.id));
      const uniqueNewGames = newGames.filter((game) => !existingIds.has(game.id));

      this.allGames.set([...currentGames, ...uniqueNewGames]);
      this.hasMoreData.set(newGames.length === take);
      this.currentPage.update((page) => page + 1);
    } catch (err) {
      console.error('Failed to load more games:', err);
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  /**
   * Reset pagination state when teams change
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
  private async fetchGames(teamIds: string[], skip: number, take: number): Promise<any[]> {
    const variables = {
      teamIds,
      args: {
        skip,
        take,
      },
    };

    const result = await lastValueFrom(
      this.apollo.query<{ competitionEncounters: any[] }>({
        query: TEAM_RECENT_GAMES_QUERY,
        variables,
        fetchPolicy: 'network-only', // Always fetch fresh data for pagination
      }),
    );

    if (!result?.data?.competitionEncounters) {
      return [];
    }

    // Extract unique games from all encounters
    const allGames = new Map<string, any>();
    result.data.competitionEncounters.forEach((encounter: any) => {
      encounter.games?.forEach((game: any) => {
        if (game && !allGames.has(game.id)) {
          // Add encounter data to game for easier access in the component
          const gameWithEncounter = {
            ...game,
            competitionEncounter: {
              id: encounter.id,
              date: encounter.date,
              visualCode: encounter.visualCode,
              homeTeamId: encounter.homeTeamId,
              awayTeamId: encounter.awayTeamId,
              homeTeam: encounter.homeTeam,
              awayTeam: encounter.awayTeam,
              drawCompetition: encounter.drawCompetition,
            },
          };
          allGames.set(game.id, gameWithEncounter);
        }
      });
    });

    return Array.from(allGames.values())
      .filter((game) => {
        // Filter played games
        return game.set1Team1 && game.set1Team1 > 0 && game.set1Team2 && game.set1Team2 > 0 && game.playedAt && new Date(game.playedAt) <= new Date();
      })
      .sort((a, b) => {
        const dateA = a.playedAt ? new Date(a.playedAt).getTime() : 0;
        const dateB = b.playedAt ? new Date(b.playedAt).getTime() : 0;
        return dateB - dateA;
      });
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
