import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { CompetitionEvent, CompetitionSubEvent, CompetitionDraw, Entry, Standing, Game, CompetitionEncounter } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export class DrawsService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    competitionId: new FormControl<string | null>(null),
    subEventId: new FormControl<string | null>(null),
    drawId: new FormControl<string | null>(null),
  });

  // Signal to store games for each encounter
  private encounterGames = signal<Record<string, Game[]>>({});

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private dataResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.competitionId || !params.subEventId || !params.drawId) {
        return null;
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{
            competitionEvent: CompetitionEvent;
            competitionSubEvent: CompetitionSubEvent;
            competitionDraw: CompetitionDraw;
            entries: Entry[];
          }>({
            query: gql`
              query CompetitionDrawDetail($competitionId: ID!, $subEventId: ID!, $drawId: ID!) {
                competitionEvent(id: $competitionId) {
                  id
                  name
                  slug
                  season
                  visualCode
                }
                competitionSubEvent(id: $subEventId) {
                  id
                  name
                  eventType
                  level
                  maxLevel
                }
                competitionDraw(id: $drawId) {
                  id
                  name
                  type
                  size
                  risers
                  fallers
                  visualCode
                  competitionEncounters {
                    id
                    date
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
                    homeScore
                    awayScore
                  }
                }
                entries(args: { where: [{ drawId: { eq: $drawId } }] }) {
                  id
                  drawId
                  player1Id
                  player2Id
                  teamId
                  player1 {
                    id
                    fullName
                    firstName
                    lastName
                  }
                  player2 {
                    id
                    fullName
                    firstName
                    lastName
                  }
                  team {
                    id
                    name
                  }
                  standing {
                    id
                    position
                    played
                    won
                    lost
                    gamesWon
                    gamesLost
                    setsWon
                    setsLost
                    points
                    riser
                    faller
                  }
                }
              }
            `,
            variables: {
              competitionId: params.competitionId,
              subEventId: params.subEventId,
              drawId: params.drawId,
            },
            context: { signal: abortSignal },
          }),
        );

        if (!result?.data?.competitionEvent || !result?.data?.competitionSubEvent || !result?.data?.competitionDraw) {
          throw new Error('No competition, sub event, or draw found');
        }

        return {
          competition: result.data.competitionEvent,
          subEvent: result.data.competitionSubEvent,
          draw: result.data.competitionDraw,
          entries: result.data.entries || [],
        };
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  competition = computed(() => this.dataResource.value()?.competition);
  subEvent = computed(() => this.dataResource.value()?.subEvent);
  draw = computed(() => this.dataResource.value()?.draw);
  encounters = computed(() => {
    const baseEncounters = this.dataResource.value()?.draw?.competitionEncounters ?? [];
    const gamesData = this.encounterGames();

    // Merge encounters with their loaded games
    return baseEncounters.map(
      (encounter) =>
        ({
          ...encounter,
          games: gamesData[encounter.id] || null,
        }) as CompetitionEncounter,
    );
  });
  standings = computed(() => {
    const entries = this.dataResource.value()?.entries || [];
    return entries
      .filter((entry) => entry.standing) // Only entries with standings
      .sort((a, b) => (a.standing?.position ?? 0) - (b.standing?.position ?? 0));
  });
  error = computed(() => this.dataResource.error()?.message || null);
  loading = computed(() => this.dataResource.isLoading());

  // Method to load games for a specific encounter
  async loadEncounterGames(encounterId: string): Promise<void> {
    try {
      const result = await lastValueFrom(
        this.apollo.query<{
          competitionEncounter: {
            games: any[];
          };
        }>({
          query: gql`
            query EncounterGames($encounterId: ID!) {
              competitionEncounter(id: $encounterId) {
                id
                games {
                  id
                  gameType
                  order
                  winner
                  set1Team1
                  set1Team2
                  set2Team1
                  set2Team2
                  set3Team1
                  set3Team2
                  gamePlayerMemberships {
                    playerId
                    gamePlayer {
                      id
                      fullName
                      firstName
                      lastName
                    }
                    team
                  }
                }
              }
            }
          `,
          variables: {
            encounterId: encounterId,
          },
        }),
      );

      if (result?.data?.competitionEncounter?.games) {
        // Update the signal with the loaded games
        this.encounterGames.update((currentGames) => ({
          ...currentGames,
          [encounterId]: result.data?.competitionEncounter?.games || [],
        }));
      } else {
        // Set empty array if no games found
        this.encounterGames.update((currentGames) => ({
          ...currentGames,
          [encounterId]: [],
        }));
      }
    } catch (err) {
      console.error('Failed to load games for encounter:', encounterId, err);
      // Set empty array to indicate loading was attempted
      this.encounterGames.update((currentGames) => ({
        ...currentGames,
        [encounterId]: [],
      }));
    }
  }

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load competition draws';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }
}
