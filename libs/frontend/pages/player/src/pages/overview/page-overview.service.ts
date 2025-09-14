import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Player } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { debounceTime } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';

export class OverviewService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    searchQuery: new FormControl(''),
    sortBy: new FormControl('fullName'),
    sortOrder: new FormControl('asc'),
    pageSize: new FormControl(25),
    currentPage: new FormControl(0),
    minAge: new FormControl(null),
    maxAge: new FormControl(null),
    club: new FormControl(null),
    showOnlyActive: new FormControl(false),
  });

  // Suggestions for autocomplete
  suggestions = signal<string[]>([]);

  // Convert form to signal for resource with debounce
  private filterSignal = toSignal(this.filter.valueChanges.pipe(debounceTime(300)));

  private playersResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params) {
        return { players: [], total: 0 };
      }

      try {
        const result = await lastValueFrom(this.apollo
          .query<{ players: Player[], playersCount: { count: number } }>({
            query: gql`
              query Players($args: PlayerArgs, $countArgs: PlayerArgs) {
                players(args: $args) {
                  id
                  memberId
                  fullName
                  slug
                  firstName
                  lastName
                  birthDate
                  clubPlayerMemberships {
                    club {
                      id
                      name
                      slug
                    }
                    start
                    end
                  }
                  competitionPlayer
                }
                playersCount(args: $countArgs) {
                  count
                }
              }
            `,
            variables: {
              args: {
                where: this._buildWhereCondition(params),
                order: this._buildOrderCondition(params),
                skip: (params?.currentPage ?? 0) * (params?.pageSize ?? 25),
                take: params?.pageSize ?? 25,
              },
              countArgs: {
                where: this._buildWhereCondition(params),
              },
            },
            context: { signal: abortSignal },
          }));

        if (!result?.data.players) {
          throw new Error('No players found');
        }
        return {
          players: result.data.players,
          total: result.data.playersCount?.count || 0
        };
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  players = computed(() => this.playersResource.value()?.players ?? []);
  paginatedPlayers = computed(() => this.playersResource.value()?.players ?? []);
  totalPlayers = computed(() => this.playersResource.value()?.total ?? 0);
  error = computed(() => this.playersResource.error()?.message || null);
  loading = computed(() => this.playersResource.isLoading());
  reload = this.playersResource.reload;

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load players';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }

  // Methods
  getSuggestions(query: string) {
    // Simple suggestion logic - could be enhanced with actual API call
    const suggestions = [
      'John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Wilson', 'David Brown',
      'Club Brussels', 'Club Antwerp', 'Club Ghent', 'Youth', 'Adult', 'Veteran'
    ].filter(s => s.toLowerCase().includes(query.toLowerCase()));
    
    this.suggestions.set(suggestions);
  }

  clearFilters() {
    this.filter.patchValue({
      searchQuery: '',
      minAge: null,
      maxAge: null,
      club: null,
      showOnlyActive: false,
    });
  }

  private _buildWhereCondition(params: any) {
    const conditions: any[] = [{ memberId: { ne: null } }];

    // Search query condition
    if (params.searchQuery) {
      const searchConditions = this._playerSearchWhere(params.searchQuery);
      if (searchConditions) {
        conditions.push({ or: searchConditions });
      }
    }

    // Age filters (calculated from birthDate - this would need server-side calculation)
    if (params.minAge !== null) {
      const maxBirthDate = new Date();
      maxBirthDate.setFullYear(maxBirthDate.getFullYear() - params.minAge);
      conditions.push({ birthDate: { lte: maxBirthDate.toISOString() } });
    }
    if (params.maxAge !== null) {
      const minBirthDate = new Date();
      minBirthDate.setFullYear(minBirthDate.getFullYear() - params.maxAge - 1);
      conditions.push({ birthDate: { gte: minBirthDate.toISOString() } });
    }

    // Club filter
    if (params.club) {
      conditions.push({ 
        clubPlayerMemberships: { 
          some: { 
            club: { name: { ilike: `%${params.club}%` } },
            end: { isNull: true }
          } 
        } 
      });
    }

    // Active player filter
    if (params.showOnlyActive) {
      conditions.push({ competitionPlayer: { eq: true } });
    }

    return conditions.length > 1 ? { and: conditions } : conditions[0];
  }

  private _buildOrderCondition(params: any) {
    const orderBy = params.sortBy || 'fullName';
    const direction = params.sortOrder === 'desc' ? 'desc' : 'asc';
    
    return { [orderBy]: direction };
  }

  private _playerSearchWhere(query: string | null | undefined) {
    const parts = query
      ?.toLowerCase()
      .replace(/[;\\\\/:*?"<>|&',]/, ' ')
      .split(' ');

    if (!parts || parts.length === 0) {
      return null;
    }

    const queries: unknown[] = [];
    for (const part of parts) {
      if (part.trim()) {
        queries.push(
          { firstName: { ilike: `%${part}%` } },
          { lastName: { ilike: `%${part}%` } },
          { memberId: { ilike: `%${part}%` } },
        );
      }
    }

    return queries.length > 0 ? queries : null;
  }
}
