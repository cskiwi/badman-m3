import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Player } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { debounceTime } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';

interface PlayerSearchFilters {
  // allow null because FormGroup.value can contain nulls
  query?: string | null;
  clubId?: string | null;
  minRating?: number | null;
  maxRating?: number | null;
  gender?: 'M' | 'F' | null;
  competitionPlayer?: boolean | null;
}

export class PlayersService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    // include null in FormControl generics to reflect actual emitted types
    query: new FormControl<string | null | undefined>(undefined),
    clubId: new FormControl<string | null | undefined>(undefined),
    minRating: new FormControl<number | null | undefined>(undefined),
    maxRating: new FormControl<number | null | undefined>(undefined),
    gender: new FormControl<'M' | 'F' | null | undefined>(undefined),
    competitionPlayer: new FormControl<boolean | null | undefined>(undefined),
  });

  // Convert form to signal for resource with debounce
  private filterSignal = toSignal(this.filter.valueChanges.pipe(debounceTime(300)));

  private playersResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params) {
        return [];
      }

      try {
        const result = await lastValueFrom(this.apollo
          .query<{ players: Player[] }>({
            query: gql`
              query Players($args: PlayerArgs) {
                players(args: $args) {
                  id
                  firstName
                  lastName
                  fullName
                  slug
                  memberId
                  gender
                  birthDate
                  competitionPlayer
                  clubPlayerMemberships {
                    id
                    start
                    end
                    club {
                      id
                      name
                      abbreviation
                    }
                  }
                  rankingPlaces {
                    id
                    place
                    single
                    double
                    mix
                    rankingDate
                    rankingSystem {
                      id
                      name
                    }
                  }
                }
              }
            `,
            variables: {
              args: { 
                where: this._buildPlayerSearchWhere(params),
                take: 50,
                orderBy: [{ firstName: 'ASC' }, { lastName: 'ASC' }]
              },
            },
            context: { signal: abortSignal },
          }));

        if (!result?.data.players) {
          throw new Error('No players found');
        }
        return result.data.players;
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  players = computed(() => this.playersResource.value() ?? []);
  error = computed(() => this.playersResource.error()?.message || null);
  loading = computed(() => this.playersResource.isLoading());

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load players';
    }

    if (err.status === 403) {
      return 'Access denied to player data';
    }

    if (err.status === 500) {
      return 'Server error while loading players';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred while loading players';
  }

  private _buildPlayerSearchWhere(filters?: PlayerSearchFilters) {
    const where: any = {};
    
    // Text search in name
    if (filters?.query && filters.query.trim()) {
      const searchTerms = filters.query
        .toLowerCase()
        .replace(/[;\\\\/:*?"<>|&',]/, ' ')
        .split(' ')
        .map((term) => term.trim())
        .filter((term) => term.length > 0);

      if (searchTerms.length > 0) {
        where.OR = searchTerms.flatMap(term => [
          { firstName: { ilike: `%${term}%` } },
          { lastName: { ilike: `%${term}%` } },
          { fullName: { ilike: `%${term}%` } }
        ]);
      }
    }

    // Club filter
    if (filters?.clubId) {
      where.clubPlayerMemberships = {
        some: {
          clubId: filters.clubId
        }
      };
    }

    // Gender filter
    if (filters?.gender) {
      where.gender = filters.gender;
    }

    // Competition player filter
    if (filters?.competitionPlayer !== undefined) {
      where.competitionPlayer = filters.competitionPlayer;
    }

    // Rating filters (based on ranking places)
    if (filters?.minRating || filters?.maxRating) {
      const ratingWhere: any = {};
      
      if (filters.minRating) {
        ratingWhere.single = { gte: filters.minRating };
      }
      
      if (filters.maxRating) {
        if (ratingWhere.single) {
          ratingWhere.single = { ...ratingWhere.single, lte: filters.maxRating };
        } else {
          ratingWhere.single = { lte: filters.maxRating };
        }
      }

      if (Object.keys(ratingWhere).length > 0) {
        where.rankingPlaces = {
          some: ratingWhere
        };
      }
    }

    return Object.keys(where).length > 0 ? where : undefined;
  }

  // Helper method to get current rating for a player
  getCurrentRating(player: Player, system: 'single' | 'double' | 'mix' = 'single'): number | null {
    if (!player.rankingPlaces || player.rankingPlaces.length === 0) {
      return null;
    }

    // Get the most recent ranking
    const sortedRankings = player.rankingPlaces
      .filter(place => place[system] !== null && place[system] !== undefined)
      .sort((a, b) => new Date(b.rankingDate).getTime() - new Date(a.rankingDate).getTime());

    return sortedRankings.length > 0 ? (sortedRankings[0][system] ?? null) : null;
  }

  // Helper method to get current club for a player
  getCurrentClub(player: Player) {
    if (!player.clubPlayerMemberships || player.clubPlayerMemberships.length === 0) {
      return null;
    }

    const now = new Date();
    const activeMemberships = player.clubPlayerMemberships.filter(membership => {
      const start = new Date(membership.start);
      const end = membership.end ? new Date(membership.end) : null;
      
      return start <= now && (!end || end >= now);
    });

    return activeMemberships.length > 0 ? activeMemberships[0].club : null;
  }
}