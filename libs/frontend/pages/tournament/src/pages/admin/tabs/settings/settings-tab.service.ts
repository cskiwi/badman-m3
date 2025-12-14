import { inject, signal } from '@angular/core';
import { TournamentEvent, TournamentSubEvent } from '@app/models';
import { TournamentPhase } from '@app/models-enum';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export class SettingsTabService {
  private readonly apollo = inject(Apollo);

  readonly updating = signal(false);
  readonly updateError = signal<string | null>(null);

  async updateTournament(
    id: string,
    data: {
      name?: string;
      firstDay?: Date;
      openDate?: Date;
      closeDate?: Date;
      official?: boolean;
      enrollmentOpenDate?: Date;
      enrollmentCloseDate?: Date;
      allowGuestEnrollments?: boolean;
      schedulePublished?: boolean;
    },
  ): Promise<TournamentEvent | null> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ updateTournamentEvent: TournamentEvent }>({
          mutation: gql`
            mutation UpdateTournamentEvent($id: ID!, $data: TournamentEventUpdateInput!) {
              updateTournamentEvent(id: $id, data: $data) {
                id
                name
                slug
                firstDay
                openDate
                closeDate
                official
                phase
                enrollmentOpenDate
                enrollmentCloseDate
                allowGuestEnrollments
                schedulePublished
              }
            }
          `,
          variables: { id, data },
        }),
      );

      return result.data?.updateTournamentEvent ?? null;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to update tournament');
      return null;
    } finally {
      this.updating.set(false);
    }
  }

  async updatePhase(id: string, phase: TournamentPhase): Promise<TournamentEvent | null> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ updateTournamentPhase: TournamentEvent }>({
          mutation: gql`
            mutation UpdateTournamentPhase($id: ID!, $phase: TournamentPhase!) {
              updateTournamentPhase(id: $id, phase: $phase) {
                id
                phase
              }
            }
          `,
          variables: { id, phase },
        }),
      );

      return result.data?.updateTournamentPhase ?? null;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to update phase');
      return null;
    } finally {
      this.updating.set(false);
    }
  }

  async createSubEvent(data: {
    eventId: string;
    name: string;
    gameType: string;
    minLevel?: number;
    maxLevel?: number;
    maxEntries?: number;
    waitingListEnabled?: boolean;
  }): Promise<TournamentSubEvent | null> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ createTournamentSubEvent: TournamentSubEvent }>({
          mutation: gql`
            mutation CreateTournamentSubEvent($data: TournamentSubEventNewInput!) {
              createTournamentSubEvent(data: $data) {
                id
                name
                gameType
                minLevel
                maxLevel
                maxEntries
                waitingListEnabled
              }
            }
          `,
          variables: { data },
        }),
      );

      return result.data?.createTournamentSubEvent ?? null;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to create sub-event');
      return null;
    } finally {
      this.updating.set(false);
    }
  }

  async updateSubEvent(
    subEventId: string,
    data: {
      name?: string;
      maxEntries?: number;
      waitingListEnabled?: boolean;
      minLevel?: number;
      maxLevel?: number;
    },
  ): Promise<TournamentSubEvent | null> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ updateTournamentSubEvent: TournamentSubEvent }>({
          mutation: gql`
            mutation UpdateTournamentSubEvent($subEventId: ID!, $data: UpdateTournamentSubEventInput!) {
              updateTournamentSubEvent(subEventId: $subEventId, data: $data) {
                id
                name
                maxEntries
                waitingListEnabled
                minLevel
                maxLevel
              }
            }
          `,
          variables: { subEventId, data },
        }),
      );

      return result.data?.updateTournamentSubEvent ?? null;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to update sub-event');
      return null;
    } finally {
      this.updating.set(false);
    }
  }

  async deleteSubEvent(subEventId: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ deleteTournamentSubEvent: boolean }>({
          mutation: gql`
            mutation DeleteTournamentSubEvent($subEventId: ID!) {
              deleteTournamentSubEvent(subEventId: $subEventId)
            }
          `,
          variables: { subEventId },
        }),
      );

      return result.data?.deleteTournamentSubEvent ?? false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to delete sub-event');
      return false;
    } finally {
      this.updating.set(false);
    }
  }
}
