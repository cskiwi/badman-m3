import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { CompetitionEncounter } from '@app/models';
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

        this._encounters.set(encounters);

        return {
          team: result.data.team,
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
