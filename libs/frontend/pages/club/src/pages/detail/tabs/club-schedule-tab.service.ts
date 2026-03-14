import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { CompetitionEncounter, Game } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

const CLUB_SCHEDULE_ENCOUNTERS_QUERY = gql`
  query ClubScheduleEncounters($teamIds: [String!]!) {
    competitionEncounters(args: { where: [{ OR: [{ homeTeamId: { in: $teamIds } }, { awayTeamId: { in: $teamIds } }] }] }) {
      id
      date
      homeTeam {
        id
        name
        abbreviation
        club {
          id
          slug
        }
      }
      awayTeam {
        id
        name
        abbreviation
        club {
          id
          slug
        }
      }
      homeScore
      awayScore
    }
  }
`;

const ENCOUNTER_GAMES_QUERY = gql`
  query ClubScheduleEncounterGames($encounterId: ID!) {
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
`;

export class ClubScheduleTabService {
  private readonly apollo = inject(Apollo);

  private teamIds = signal<string[]>([]);

  // Signal to store games for each encounter (null = not loaded yet)
  private encounterGames = signal<Record<string, Game[]>>({});

  private encountersResource = resource({
    params: () => ({ teamIds: this.teamIds() }),
    loader: async ({ params, abortSignal }) => {
      if (!params.teamIds.length) {
        return [];
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ competitionEncounters: CompetitionEncounter[] }>({
            query: CLUB_SCHEDULE_ENCOUNTERS_QUERY,
            variables: {
              teamIds: params.teamIds,
            },
            context: { signal: abortSignal },
          }),
        );

        return result.data?.competitionEncounters ?? [];
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  encounters = computed(() => {
    const baseEncounters = this.encountersResource.value() ?? [];
    const gamesData = this.encounterGames();

    return baseEncounters
      .map(
        (encounter) =>
          ({
            ...encounter,
            // null = not yet loaded; undefined/[] = loaded (empty or with data)
            games: gamesData[encounter.id] !== undefined ? gamesData[encounter.id] : null,
          }) as CompetitionEncounter,
      )
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateA - dateB;
      });
  });

  playedEncounters = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.encounters()
      .filter((e) => e.date && new Date(e.date) < today)
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA; // most recent first
      });
  });

  upcomingEncounters = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.encounters()
      .filter((e) => !e.date || new Date(e.date) >= today)
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateA - dateB; // soonest first
      });
  });

  loading = computed(() => this.encountersResource.isLoading());
  error = computed(() => this.encountersResource.error()?.message || null);

  setTeamIds(teamIds: string[]) {
    this.teamIds.set(teamIds);
  }

  async loadEncounterGames(encounterId: string): Promise<void> {
    try {
      const result = await lastValueFrom(
        this.apollo.query<{ competitionEncounter: { games: Game[] } }>({
          query: ENCOUNTER_GAMES_QUERY,
          variables: { encounterId },
        }),
      );

      this.encounterGames.update((current) => ({
        ...current,
        [encounterId]: result.data?.competitionEncounter?.games ?? [],
      }));
    } catch (err) {
      console.error('Failed to load games for encounter:', encounterId, err);
      this.encounterGames.update((current) => ({
        ...current,
        [encounterId]: [],
      }));
    }
  }

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404 && err.url) {
      return 'Failed to load club encounters';
    }
    return err.statusText || 'An error occurred';
  }
}
