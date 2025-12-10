import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { Club, TournamentEvent } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export class CreateTournamentService {
  private readonly apollo = inject(Apollo);

  private clubId = signal<string | null>(null);

  private clubResource = resource({
    params: () => ({
      clubId: this.clubId(),
    }),
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId) {
        return null;
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ club: Club }>({
            query: gql`
              query ClubForTournament($clubId: ID!) {
                club(id: $clubId) {
                  id
                  name
                  fullName
                  slug
                }
              }
            `,
            variables: {
              clubId: params.clubId,
            },
            context: { signal: abortSignal },
          }),
        );

        return result.data.club;
      } catch (err) {
        console.error(err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  club = computed(() => this.clubResource.value());
  loading = computed(() => this.clubResource.isLoading());
  error = computed(() => this.clubResource.error()?.message || null);

  // Creating state
  private _creating = signal(false);
  private _createError = signal<string | null>(null);

  creating = this._creating.asReadonly();
  createError = this._createError.asReadonly();

  setClubId(clubId: string | null) {
    this.clubId.set(clubId);
  }

  async createTournament(data: {
    name: string;
    firstDay?: Date;
    openDate?: Date;
    closeDate?: Date;
    official?: boolean;
  }): Promise<TournamentEvent | null> {
    const clubId = this.clubId();
    if (!clubId) {
      this._createError.set('No club selected');
      return null;
    }

    this._creating.set(true);
    this._createError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ createTournamentEvent: TournamentEvent }>({
          mutation: gql`
            mutation CreateTournamentEvent($data: TournamentEventCreateInput!) {
              createTournamentEvent(data: $data) {
                id
                name
                slug
              }
            }
          `,
          variables: {
            data: {
              name: data.name,
              clubId,
              firstDay: data.firstDay?.toISOString(),
              openDate: data.openDate?.toISOString(),
              closeDate: data.closeDate?.toISOString(),
              official: data.official ?? false,
            },
          },
        }),
      );

      return result.data?.createTournamentEvent || null;
    } catch (err) {
      console.error(err);
      this._createError.set(this.handleError(err as HttpErrorResponse));
      return null;
    } finally {
      this._creating.set(false);
    }
  }

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404 && err.url) {
      return 'Failed to load club';
    }
    return err.statusText || 'An error occurred';
  }
}
