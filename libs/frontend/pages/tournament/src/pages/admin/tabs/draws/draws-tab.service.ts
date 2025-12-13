import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Entry, TournamentDraw, TournamentSubEvent } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export type SeedingMethod = 'BY_RANKING' | 'RANDOM' | 'MANUAL';

export class DrawsTabService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    subEventId: new FormControl<string | null>(null),
  });

  private filterSignal = toSignal(this.filter.valueChanges);

  // Loading and error states
  readonly updating = signal(false);
  readonly updateError = signal<string | null>(null);

  // Entries resource
  private entriesResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.subEventId) {
        return { entries: [], unassignedEntries: [], draws: [] };
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{
            tournamentSubEvent: TournamentSubEvent & {
              entries: Entry[];
              unassignedEntries: Entry[];
              drawTournaments: TournamentDraw[];
            };
          }>({
            query: gql`
              query SubEventDrawsData($subEventId: ID!) {
                tournamentSubEvent(id: $subEventId) {
                  id
                  name
                  gameType
                  entries {
                    id
                    seed
                    drawId
                    player1 {
                      id
                      firstName
                      lastName
                      fullName
                    }
                    player2 {
                      id
                      firstName
                      lastName
                      fullName
                    }
                  }
                  unassignedEntries {
                    id
                    seed
                    player1 {
                      id
                      firstName
                      lastName
                      fullName
                    }
                    player2 {
                      id
                      firstName
                      lastName
                      fullName
                    }
                  }
                  drawTournaments {
                    id
                    name
                    type
                    size
                    entryCount
                    entries {
                      id
                      seed
                      player1 {
                        id
                        firstName
                        lastName
                        fullName
                      }
                      player2 {
                        id
                        firstName
                        lastName
                        fullName
                      }
                    }
                  }
                }
              }
            `,
            variables: { subEventId: params.subEventId },
            context: { signal: abortSignal },
            fetchPolicy: 'network-only',
          }),
        );

        const subEvent = result.data?.tournamentSubEvent;
        return {
          entries: subEvent?.entries ?? [],
          unassignedEntries: subEvent?.unassignedEntries ?? [],
          draws: subEvent?.drawTournaments ?? [],
        };
      } catch {
        return { entries: [], unassignedEntries: [], draws: [] };
      }
    },
  });

  // Public selectors
  entries = computed(() => this.entriesResource.value()?.entries ?? []);
  unassignedEntries = computed(() => this.entriesResource.value()?.unassignedEntries ?? []);
  draws = computed(() => this.entriesResource.value()?.draws ?? []);
  loading = computed(() => this.entriesResource.isLoading());
  error = computed(() => this.entriesResource.error()?.message || null);

  // Stats
  stats = computed(() => {
    const allEntries = this.entries();
    const unassigned = this.unassignedEntries();
    const drawsList = this.draws();
    const assigned = allEntries.length - unassigned.length;

    return {
      total: allEntries.length,
      assigned,
      unassigned: unassigned.length,
      draws: drawsList.length,
    };
  });

  refetch() {
    this.entriesResource.reload();
  }

  async generateEntries(subEventId: string, force = false): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ generateEntriesFromEnrollments: Entry[] }>({
          mutation: gql`
            mutation GenerateEntriesFromEnrollments($input: GenerateEntriesFromEnrollmentsInput!) {
              generateEntriesFromEnrollments(input: $input) {
                id
                player1 {
                  id
                  fullName
                }
                player2 {
                  id
                  fullName
                }
              }
            }
          `,
          variables: {
            input: { subEventId, force },
          },
        }),
      );

      if (result.data?.generateEntriesFromEnrollments) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to generate entries');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async createDraw(subEventId: string, name: string, type: string, size?: number): Promise<TournamentDraw | null> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ createTournamentDraw: TournamentDraw }>({
          mutation: gql`
            mutation CreateTournamentDraw($input: CreateTournamentDrawInput!) {
              createTournamentDraw(input: $input) {
                id
                name
                type
                size
              }
            }
          `,
          variables: {
            input: { subEventId, name, type, size },
          },
        }),
      );

      if (result.data?.createTournamentDraw) {
        this.refetch();
        return result.data.createTournamentDraw;
      }
      return null;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to create draw');
      return null;
    } finally {
      this.updating.set(false);
    }
  }

  async deleteDraw(drawId: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ deleteTournamentDraw: boolean }>({
          mutation: gql`
            mutation DeleteTournamentDraw($drawId: ID!) {
              deleteTournamentDraw(drawId: $drawId)
            }
          `,
          variables: { drawId },
        }),
      );

      if (result.data?.deleteTournamentDraw) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to delete draw');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async assignEntriesToDraw(entryIds: string[], drawId: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ assignEntriesToDraw: Entry[] }>({
          mutation: gql`
            mutation AssignEntriesToDraw($input: AssignEntriesToDrawInput!) {
              assignEntriesToDraw(input: $input) {
                id
                drawId
              }
            }
          `,
          variables: {
            input: { entryIds, drawId },
          },
        }),
      );

      if (result.data?.assignEntriesToDraw) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to assign entries');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async removeEntryFromDraw(entryId: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ removeEntryFromDraw: Entry }>({
          mutation: gql`
            mutation RemoveEntryFromDraw($input: RemoveEntryFromDrawInput!) {
              removeEntryFromDraw(input: $input) {
                id
                drawId
              }
            }
          `,
          variables: {
            input: { entryId },
          },
        }),
      );

      if (result.data?.removeEntryFromDraw) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to remove entry from draw');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async autoSeedDraw(drawId: string, method: SeedingMethod): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ autoSeedDraw: Entry[] }>({
          mutation: gql`
            mutation AutoSeedDraw($input: AutoSeedDrawInput!) {
              autoSeedDraw(input: $input) {
                id
                seed
              }
            }
          `,
          variables: {
            input: { drawId, method },
          },
        }),
      );

      if (result.data?.autoSeedDraw) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to auto-seed draw');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async clearDrawSeeds(drawId: string): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ clearDrawSeeds: Entry[] }>({
          mutation: gql`
            mutation ClearDrawSeeds($drawId: ID!) {
              clearDrawSeeds(drawId: $drawId) {
                id
                seed
              }
            }
          `,
          variables: { drawId },
        }),
      );

      if (result.data?.clearDrawSeeds) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to clear seeds');
      return false;
    } finally {
      this.updating.set(false);
    }
  }

  async setEntrySeed(entryId: string, seed: number): Promise<boolean> {
    this.updating.set(true);
    this.updateError.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ setEntrySeed: Entry }>({
          mutation: gql`
            mutation SetEntrySeed($input: SetEntrySeedInput!) {
              setEntrySeed(input: $input) {
                id
                seed
              }
            }
          `,
          variables: {
            input: { entryId, seed },
          },
        }),
      );

      if (result.data?.setEntrySeed) {
        this.refetch();
        return true;
      }
      return false;
    } catch (err) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to set seed');
      return false;
    } finally {
      this.updating.set(false);
    }
  }
}
