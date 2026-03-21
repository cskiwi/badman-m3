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
  encountersPlayed: number;
  totalEncounters: number;
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
                        slug
                      }
                    }
                  }
                }
                entries(args: { where: [{ teamId: { eq: $teamIdStr } }] }) {
                  id
                  drawId
                  meta {
                    competition {
                      players {
                        id
                      }
                    }
                  }
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

  private basePlayerIds = computed(() => {
    const entries = this.dataResource.value()?.entries ?? [];
    const ids = new Set<string>();
    for (const entry of entries) {
      for (const p of entry.meta?.competition?.players ?? []) {
        if (p.id) ids.add(p.id);
      }
    }
    return ids;
  });

  players = computed(() => {
    const memberships = this.dataResource.value()?.team?.teamPlayerMemberships ?? [];
    const baseIds = this.basePlayerIds();
    const team = this.team();
    const encounters = this._encounters();

    // Start with existing memberships, flagging base players
    const memberPlayerIds = new Set<string>();
    const result = memberships.map((m: any) => {
      if (m.player?.id) memberPlayerIds.add(m.player.id);
      return {
        ...m,
        isBase: m.player?.id ? baseIds.has(m.player.id) : false,
      };
    });

    // Collect players from games who are not in team memberships
    if (team && encounters.length > 0) {
      const gameOnlyPlayers = new Map<string, any>();

      for (const encounter of encounters) {
        if (!encounter.games) continue;
        const teamNumber = encounter.homeTeam?.id === team.id ? 1 : 2;

        for (const game of encounter.games) {
          for (const gm of game.gamePlayerMemberships ?? []) {
            if (gm.team !== teamNumber || !gm.playerId) continue;
            if (memberPlayerIds.has(gm.playerId)) continue;
            if (gameOnlyPlayers.has(gm.playerId)) continue;
            gameOnlyPlayers.set(gm.playerId, {
              id: `game-${gm.playerId}`,
              membershipType: 'BACKUP *',
              isBase: baseIds.has(gm.playerId),
              player: {
                id: gm.playerId,
                fullName: gm.gamePlayer?.fullName,
                slug: gm.gamePlayer?.slug,
              },
            });
          }
        }
      }

      result.push(...gameOnlyPlayers.values());
    }

    return result;
  });

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

    const now = new Date();
    const playedEncounters = encounters.filter((e) => e.date && new Date(e.date) < now);
    const totalEncounters = playedEncounters.length;
    const statsMap = new Map<string, PlayerStats>();

    for (const encounter of playedEncounters) {
      if (!encounter.games) continue;

      // Determine which team number (1=home, 2=away) this team is
      const teamNumber = encounter.homeTeam?.id === team.id ? 1 : 2;

      // Track which players were present in this encounter
      const presentInEncounter = new Set<string>();

      for (const game of encounter.games) {
        const memberships = (game.gamePlayerMemberships || []).filter((m: any) => m.team === teamNumber);

        for (const membership of memberships) {
          const playerId = membership.playerId;
          if (!playerId) continue;

          if (!statsMap.has(playerId)) {
            statsMap.set(playerId, { played: 0, won: 0, lost: 0, encountersPlayed: 0, totalEncounters });
          }

          presentInEncounter.add(playerId);

          const stats = statsMap.get(playerId)!;
          stats.played++;

          if (game.winner === teamNumber) {
            stats.won++;
          } else if (game.winner && game.winner !== teamNumber) {
            stats.lost++;
          }
        }
      }

      // Increment encounter count for each player present
      for (const playerId of presentInEncounter) {
        statsMap.get(playerId)!.encountersPlayed++;
      }
    }

    // Ensure totalEncounters is set for all entries
    for (const stats of statsMap.values()) {
      stats.totalEncounters = totalEncounters;
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
