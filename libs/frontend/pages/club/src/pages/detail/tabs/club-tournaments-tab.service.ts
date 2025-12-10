import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { TournamentEvent } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export class ClubTournamentsTabService {
  private readonly apollo = inject(Apollo);

  private clubId = signal<string | null>(null);

  private tournamentsResource = resource({
    params: () => ({
      clubId: this.clubId(),
    }),
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId) {
        return [];
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ club: { tournamentEvents: TournamentEvent[] } }>({
            query: gql`
              query ClubTournaments($clubId: ID!) {
                club(id: $clubId) {
                  id
                  tournamentEvents(args: { order: { firstDay: DESC }, take: 50 }) {
                    id
                    name
                    slug
                    firstDay
                    openDate
                    closeDate
                    tournamentNumber
                    visualCode
                    official
                    state
                    country
                    phase
                    enrollmentOpenDate
                    enrollmentCloseDate
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

        return result.data.club?.tournamentEvents || [];
      } catch (err) {
        console.error(err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  tournaments = computed(() => this.tournamentsResource.value() || []);
  loading = computed(() => this.tournamentsResource.isLoading());
  error = computed(() => this.tournamentsResource.error()?.message || null);

  setClubId(clubId: string | null) {
    this.clubId.set(clubId);
  }

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404 && err.url) {
      return 'Failed to load tournaments';
    }
    return err.statusText || 'An error occurred';
  }
}
