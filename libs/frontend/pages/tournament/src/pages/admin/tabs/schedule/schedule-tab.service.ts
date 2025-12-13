import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Court, Game, TournamentScheduleSlot } from '@app/models';
import { ScheduleSlotStatus, ScheduleStrategy } from '@app/models-enum';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export interface ScheduleConflict {
  gameId: string;
  playerId: string;
  playerName: string;
  conflictingGameIds: string[];
  message: string;
}

export interface ScheduleResult {
  scheduledCount: number;
  skippedCount: number;
  conflicts: ScheduleConflict[];
}

export class ScheduleTabService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    tournamentEventId: new FormControl<string | null>(null),
    date: new FormControl<Date | null>(null),
  });

  private filterSignal = toSignal(this.filter.valueChanges);

  // Loading and error states
  readonly updating = signal(false);
  readonly updateError = signal<string | null>(null);

  // Schedule data resource
  private scheduleResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.tournamentEventId) {
        return { slots: [], courts: [], unscheduledGames: [] };
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{
            tournamentSchedule: TournamentScheduleSlot[];
            unscheduledGames: Game[];
            tournamentEvent: { location?: { courts?: Court[] } };
          }>({
            query: gql`
              query TournamentScheduleData($tournamentEventId: ID!, $date: DateTime) {
                tournamentSchedule(tournamentEventId: $tournamentEventId, date: $date) {
                  id
                  courtId
                  startTime
                  endTime
                  status
                  order
                  gameId
                  court {
                    id
                    name
                  }
                  game {
                    id
                    round
                    order
                    gamePlayerMemberships {
                      single
                      double
                      player {
                        id
                        fullName
                      }
                    }
                    tournamentDraw {
                      id
                      name
                      tournamentSubEvent {
                        id
                        name
                        gameType
                      }
                    }
                  }
                }
                unscheduledGames(tournamentEventId: $tournamentEventId) {
                  id
                  round
                  order
                  gamePlayerMemberships {
                    single
                    double
                    player {
                      id
                      fullName
                    }
                  }
                  tournamentDraw {
                    id
                    name
                    tournamentSubEvent {
                      id
                      name
                      gameType
                    }
                  }
                }
                tournamentEvent(id: $tournamentEventId) {
                  location {
                    courts {
                      id
                      name
                    }
                  }
                }
              }
            `,
            variables: {
              tournamentEventId: params.tournamentEventId,
              date: params.date ?? undefined,
            },
            context: { signal: abortSignal },
            fetchPolicy: 'network-only',
          }),
        );

        return {
          slots: result.data?.tournamentSchedule ?? [],
          courts: result.data?.tournamentEvent?.location?.courts ?? [],
          unscheduledGames: result.data?.unscheduledGames ?? [],
        };
      } catch {
        return { slots: [], courts: [], unscheduledGames: [] };
      }
    },
  });

  // Public selectors
  slots = computed(() => this.scheduleResource.value()?.slots ?? []);
  courts = computed(() => this.scheduleResource.value()?.courts ?? []);
  unscheduledGames = computed(() => this.scheduleResource.value()?.unscheduledGames ?? []);
  loading = computed(() => this.scheduleResource.isLoading());
  error = computed(() => this.scheduleResource.error()?.message || null);

  // Stats
  stats = computed(() => {
    const allSlots = this.slots();
    const unscheduled = this.unscheduledGames();

    return {
      totalSlots: allSlots.length,
      available: allSlots.filter((s) => s.status === ScheduleSlotStatus.AVAILABLE).length,
      scheduled: allSlots.filter((s) => s.status === ScheduleSlotStatus.SCHEDULED).length,
      inProgress: allSlots.filter((s) => s.status === ScheduleSlotStatus.IN_PROGRESS).length,
      blocked: allSlots.filter((s) => s.status === ScheduleSlotStatus.BLOCKED).length,
      unscheduledGames: unscheduled.length,
    };
  });

  // Group slots by time for grid display
  slotsGroupedByTime = computed(() => {
    const allSlots = this.slots();
    const grouped = new Map<string, TournamentScheduleSlot[]>();

    for (const slot of allSlots) {
      const timeKey = new Date(slot.startTime).toISOString();
      if (!grouped.has(timeKey)) {
        grouped.set(timeKey, []);
      }
      grouped.get(timeKey)!.push(slot);
    }

    // Sort by time
    const sortedEntries = Array.from(grouped.entries()).sort(
      ([a], [b]) => new Date(a).getTime() - new Date(b).getTime(),
    );

    return sortedEntries.map(([time, slots]) => ({
      time: new Date(time),
      slots: slots.sort((a, b) => {
        const courtA = a.court?.name ?? '';
        const courtB = b.court?.name ?? '';
        return courtA.localeCompare(courtB);
      }),
    }));
  });

  // Get unique dates from slots for date selector
  availableDates = computed(() => {
    const allSlots = this.slots();
    const dates = new Set<string>();

    for (const slot of allSlots) {
      const date = new Date(slot.startTime);
      date.setHours(0, 0, 0, 0);
      dates.add(date.toISOString());
    }

    return Array.from(dates)
      .sort()
      .map((d) => new Date(d));
  });

  refetch() {
    this.scheduleResource.reload();
  }

  async generateTimeSlots(
    tournamentEventId: string,
    courtIds: string[],
    dates: Date[],
    startTime: string,
    endTime: string,
    slotDurationMinutes: number,
    breakMinutes: number,
  ): Promise<TournamentScheduleSlot[]> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ generateTimeSlots: TournamentScheduleSlot[] }>({
          mutation: gql`
            mutation GenerateTimeSlots($input: GenerateTimeSlotsInput!) {
              generateTimeSlots(input: $input) {
                id
                courtId
                startTime
                endTime
                status
              }
            }
          `,
          variables: {
            input: {
              tournamentEventId,
              courtIds,
              dates,
              startTime,
              endTime,
              slotDurationMinutes,
              breakMinutes,
            },
          },
        }),
      );

      this.refetch();
      return result.data?.generateTimeSlots ?? [];
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to generate time slots');
      return [];
    } finally {
      this.updating.set(false);
    }
  }

  async assignGameToSlot(gameId: string, slotId: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ assignGameToSlot: TournamentScheduleSlot }>({
          mutation: gql`
            mutation AssignGameToSlot($input: AssignGameToSlotInput!) {
              assignGameToSlot(input: $input) {
                id
                status
                gameId
              }
            }
          `,
          variables: {
            input: { gameId, slotId },
          },
        }),
      );

      if (result.data?.assignGameToSlot) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to assign game to slot');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async removeGameFromSlot(slotId: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ removeGameFromSlot: TournamentScheduleSlot }>({
          mutation: gql`
            mutation RemoveGameFromSlot($slotId: ID!) {
              removeGameFromSlot(slotId: $slotId) {
                id
                status
                gameId
              }
            }
          `,
          variables: { slotId },
        }),
      );

      if (result.data?.removeGameFromSlot) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to remove game from slot');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async blockSlot(slotId: string, reason?: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ blockScheduleSlot: TournamentScheduleSlot }>({
          mutation: gql`
            mutation BlockScheduleSlot($input: BlockSlotInput!) {
              blockScheduleSlot(input: $input) {
                id
                status
              }
            }
          `,
          variables: {
            input: { slotId, reason },
          },
        }),
      );

      if (result.data?.blockScheduleSlot) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to block slot');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async unblockSlot(slotId: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ unblockScheduleSlot: TournamentScheduleSlot }>({
          mutation: gql`
            mutation UnblockScheduleSlot($slotId: ID!) {
              unblockScheduleSlot(slotId: $slotId) {
                id
                status
              }
            }
          `,
          variables: { slotId },
        }),
      );

      if (result.data?.unblockScheduleSlot) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to unblock slot');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async deleteSlot(slotId: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ deleteScheduleSlot: boolean }>({
          mutation: gql`
            mutation DeleteScheduleSlot($slotId: ID!) {
              deleteScheduleSlot(slotId: $slotId)
            }
          `,
          variables: { slotId },
        }),
      );

      if (result.data?.deleteScheduleSlot) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to delete slot');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async scheduleGames(
    tournamentEventId: string,
    strategy: ScheduleStrategy,
    minRestMinutes?: number,
    drawIds?: string[],
  ): Promise<ScheduleResult | null> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ scheduleGames: ScheduleResult }>({
          mutation: gql`
            mutation ScheduleGames($input: ScheduleGamesInput!) {
              scheduleGames(input: $input) {
                scheduledCount
                skippedCount
                conflicts {
                  gameId
                  playerId
                  playerName
                  conflictingGameIds
                  message
                }
              }
            }
          `,
          variables: {
            input: {
              tournamentEventId,
              strategy,
              minRestMinutes: minRestMinutes ?? 15,
              drawIds: drawIds ?? undefined,
            },
          },
        }),
      );

      if (result.data?.scheduleGames) {
        this.refetch();
        return result.data.scheduleGames;
      }
      return null;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to auto-schedule games');
      return null;
    } finally {
      this.updating.set(false);
    }
  }

  async publishSchedule(tournamentEventId: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ publishSchedule: boolean }>({
          mutation: gql`
            mutation PublishSchedule($tournamentEventId: ID!) {
              publishSchedule(tournamentEventId: $tournamentEventId)
            }
          `,
          variables: { tournamentEventId },
        }),
      );

      if (result.data?.publishSchedule) {
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to publish schedule');
      return false;
    } finally {
      this.updating.set(false);
    }
  }
}
