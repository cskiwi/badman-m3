import { inject, signal } from '@angular/core';
import { TournamentEvent, TournamentSubEvent } from '@app/models';
import { TournamentPhase } from '@app/models-enum';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

interface PhaseStep {
  phase: TournamentPhase;
  label: string;
  icon: string;
  description: string;
}

export class SettingsTabService {
  private readonly apollo = inject(Apollo);

  readonly updating = signal(false);
  readonly updateError = signal<string | null>(null);

  private readonly phaseSteps: PhaseStep[] = [
    {
      phase: TournamentPhase.DRAFT,
      label: 'all.tournament.phases.draft',
      icon: 'pi pi-file-edit',
      description: 'all.tournament.phases.draftDesc',
    },
    {
      phase: TournamentPhase.ENROLLMENT_OPEN,
      label: 'all.tournament.phases.enrollmentOpen',
      icon: 'pi pi-user-plus',
      description: 'all.tournament.phases.enrollmentOpenDesc',
    },
    {
      phase: TournamentPhase.ENROLLMENT_CLOSED,
      label: 'all.tournament.phases.enrollmentClosed',
      icon: 'pi pi-lock',
      description: 'all.tournament.phases.enrollmentClosedDesc',
    },
    {
      phase: TournamentPhase.DRAWS_MADE,
      label: 'all.tournament.phases.drawsMade',
      icon: 'pi pi-sitemap',
      description: 'all.tournament.phases.drawsMadeDesc',
    },
    {
      phase: TournamentPhase.SCHEDULED,
      label: 'all.tournament.phases.scheduled',
      icon: 'pi pi-calendar',
      description: 'all.tournament.phases.scheduledDesc',
    },
    {
      phase: TournamentPhase.IN_PROGRESS,
      label: 'all.tournament.phases.inProgress',
      icon: 'pi pi-play',
      description: 'all.tournament.phases.inProgressDesc',
    },
    {
      phase: TournamentPhase.COMPLETED,
      label: 'all.tournament.phases.completed',
      icon: 'pi pi-check-circle',
      description: 'all.tournament.phases.completedDesc',
    },
  ];

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
    eventType?: string;
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
      eventType?: string;
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

  async advancePhase(tournament: TournamentEvent): Promise<TournamentEvent | null> {
    const currentIndex = this.phaseSteps.findIndex((s) => s.phase === tournament.phase);
    if (currentIndex < 0 || currentIndex >= this.phaseSteps.length - 1) return null;

    const nextPhase = this.phaseSteps[currentIndex + 1].phase;
    return this.updatePhase(tournament.id, nextPhase);
  }

  async goBackPhase(tournament: TournamentEvent): Promise<TournamentEvent | null> {
    const currentIndex = this.phaseSteps.findIndex((s) => s.phase === tournament.phase);
    if (currentIndex <= 0) return null;

    const prevPhase = this.phaseSteps[currentIndex - 1].phase;
    return this.updatePhase(tournament.id, prevPhase);
  }
}
