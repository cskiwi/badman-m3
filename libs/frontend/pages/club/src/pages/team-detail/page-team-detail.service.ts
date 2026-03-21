import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { CompetitionEncounter, Entry } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export interface PlayerStats {
  played: number;
  won: number;
  lost: number;
}

export class TeamDetailService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    teamId: new FormControl<string | null>(null),
  });

  private filterSignal = toSignal(this.filter.valueChanges);

  // Mutable encounters signal for lazy game loading
  private _encounters = signal<CompetitionEncounter[]>([]);

  private dataResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.teamId) {
        return null;
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{
            team: any;
            competitionEncounters: CompetitionEncounter[];
            entries: Entry[];
          }>({
            query: gql`
              query TeamDetail($teamId: ID!, $teamIdStr: String!) {
                team(id: $teamId) {
                  id
                  name
                  abbreviation
                  type
                  season
                  email
                  phone
                  slug
                  visualCode
                  preferredDay
                  preferredTime
                  captainId
                  captain {
                    id
                    firstName
                    lastName
                    fullName
                    slug
                  }
                  club {
                    id
                    name
                    slug
                  }
                  teamPlayerMemberships {
                    id
                    membershipType
                    start
                    end
                    player {
                      id
                      firstName
                      lastName
                      fullName
                      slug
                    }
                  }
                }
                competitionEncounters(
                  args: { where: [{ OR: [{ homeTeamId: { eq: $teamIdStr } }, { awayTeamId: { eq: $teamIdStr } }] }] }
                ) {
                  id
                  drawId
                  date
                  homeScore
                  awayScore
                  finished
                  accepted
                  homeTeam {
                    id
                    name
                    abbreviation
                    club {
                      id
                      name
                      slug
                    }
                  }
                  awayTeam {
                    id
                    name
                    abbreviation
                    club {
                      id
                      name
                      slug
                    }
                  }
                  games {
                    id
                    gameType
                    winner
                    set1Team1
                    set1Team2
                    set2Team1
                    set2Team2
                    set3Team1
                    set3Team2
                    gamePlayerMemberships {
                      id
                      team
                      playerId
                      single
                      double
                      mix
                      gamePlayer {
                        id
                        fullName
                      }
                    }
                  }
                }
                entries(args: { where: [{ teamId: { eq: $teamIdStr } }] }) {
                  id
                  drawId
                  competitionDraw {
                    id
                    name
                    competitionSubEvent {
                      id
                      name
                      eventId
                      level
                      maxLevel
                      competitionEvent {
                        id
                        name
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              teamId: params.teamId,
              teamIdStr: params.teamId,
            },
            context: { signal: abortSignal },
          }),
        );

        if (!result?.data?.team) {
          throw new Error('Team not found');
        }

        const encounters = (result.data.competitionEncounters || []) as CompetitionEncounter[];
        const entries = (result.data.entries || []) as Entry[];

        this._encounters.set(encounters);

        return {
          team: result.data.team,
          entries,
        };
      } catch (err) {
        console.error(err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  team = computed(() => this.dataResource.value()?.team);
  players = computed(() => this.dataResource.value()?.team?.teamPlayerMemberships ?? []);

  // Fallback drawId from encounters when entries have no draw info
  private fallbackDrawId = computed(() => {
    const entries = this.dataResource.value()?.entries ?? [];
    const hasEntryWithDraw = entries.some(
      (e) => e.competitionDraw?.competitionSubEvent?.eventId,
    );
    if (hasEntryWithDraw) return null;

    return this._encounters().find((e) => e.drawId)?.drawId ?? null;
  });

  private fallbackDrawResource = resource({
    params: this.fallbackDrawId,
    loader: async ({ params: drawId, abortSignal }) => {
      if (!drawId) return null;

      const result = await lastValueFrom(
        this.apollo.query<{ competitionDraw: any }>({
          query: gql`
            query FallbackDraw($drawId: ID!) {
              competitionDraw(id: $drawId) {
                id
                name
                competitionSubEvent {
                  id
                  name
                  eventId
                  level
                  maxLevel
                }
              }
            }
          `,
          variables: { drawId },
          context: { signal: abortSignal },
        }),
      );

      return result?.data?.competitionDraw ?? null;
    },
  });

  entry = computed(() => {
    const entries = this.dataResource.value()?.entries ?? [];

    // Prefer entry with full draw info from entries query
    const entryWithDraw = entries.find(
      (e) => e.competitionDraw?.competitionSubEvent?.eventId,
    );
    if (entryWithDraw) {
      return entryWithDraw;
    }

    // Fallback: use separately fetched draw from encounter drawId
    const fallbackDraw = this.fallbackDrawResource.value();
    if (fallbackDraw) {
      return {
        drawId: fallbackDraw.id,
        competitionDraw: fallbackDraw,
      } as Partial<Entry>;
    }

    return null;
  });

  playerStats = computed(() => {
    const encounters = this._encounters();
    const team = this.team();
    if (!team || encounters.length === 0) return new Map<string, PlayerStats>();

    const statsMap = new Map<string, PlayerStats>();

    for (const encounter of encounters) {
      if (!encounter.games) continue;

      // Determine which team number (1=home, 2=away) this team is
      const teamNumber = encounter.homeTeam?.id === team.id ? 1 : 2;

      for (const game of encounter.games) {
        const memberships = (game.gamePlayerMemberships || []).filter((m: any) => m.team === teamNumber);

        for (const membership of memberships) {
          const playerId = membership.playerId;
          if (!playerId) continue;

          if (!statsMap.has(playerId)) {
            statsMap.set(playerId, { played: 0, won: 0, lost: 0 });
          }

          const stats = statsMap.get(playerId)!;
          stats.played++;

          if (game.winner === teamNumber) {
            stats.won++;
          } else if (game.winner && game.winner !== teamNumber) {
            stats.lost++;
          }
        }
      }
    }

    return statsMap;
  });

  encounters = this._encounters.asReadonly();

  playedEncounters = computed(() => {
    const now = new Date();
    return this._encounters()
      .filter((e) => e.date && new Date(e.date) < now)
      .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());
  });

  upcomingEncounters = computed(() => {
    const now = new Date();
    return this._encounters()
      .filter((e) => !e.date || new Date(e.date) >= now)
      .sort((a, b) => {
        if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (a.date && !b.date) return -1;
        if (!a.date && b.date) return 1;
        return 0;
      });
  });

  error = computed(() => this.dataResource.error()?.message || null);
  loading = computed(() => this.dataResource.isLoading());

  async loadEncounterGames(encounterId: string): Promise<void> {
    try {
      const result = await lastValueFrom(
        this.apollo.query<{ competitionEncounter: CompetitionEncounter }>({
          query: gql`
            query TeamEncounterGames($encounterId: ID!) {
              competitionEncounter(id: $encounterId) {
                id
                games {
                  id
                  playedAt
                  gameType
                  status
                  set1Team1
                  set1Team2
                  set2Team1
                  set2Team2
                  set3Team1
                  set3Team2
                  winner
                  order
                  round
                  gamePlayerMemberships {
                    id
                    team
                    playerId
                    single
                    double
                    mix
                    gamePlayer {
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
          variables: { encounterId },
        }),
      );
    } catch (err) {
      console.error('Failed to load encounter games:', err);
    }
  }

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404 && err.url) {
      return 'Failed to load team details';
    }
    return err.statusText || 'An error occurred';
  }
}
