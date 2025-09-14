import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Player, Game, Entry, TournamentEvent, TournamentSubEvent, TournamentDraw } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export interface PlayerStatistics {
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  setsWon: number;
  setsLost: number;
  setWinRate: number;
  pointsWon: number;
  pointsLost: number;
  pointWinRate: number;
  tournaments: number;
  avgPosition: number;
  bestPosition: number;
}

export interface PlayerTournamentHistory {
  tournament?: TournamentEvent;
  subEvent?: TournamentSubEvent;
  draw?: TournamentDraw;
  entry?: Entry;
  games?: Game[];
  finalPosition?: number;
}

export class PlayerDetailService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    playerId: new FormControl<string | null>(null),
  });

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private dataResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.playerId) {
        return null;
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{
            player: Player;
            playerGames: Game[];
            playerEntries: Array<
              Entry & {
                draw: TournamentDraw & {
                  subEvent: TournamentSubEvent & {
                    tournament: TournamentEvent;
                  };
                };
              }
            >;
          }>({
            query: gql`
              query PlayerDetail($playerId: ID!) {
                player(id: $playerId) {
                  id
                  firstName
                  lastName
                  fullName
                  email
                  phone
                  gender
                  birthDate
                  memberId
                  competitionPlayer
                  single
                  double
                  mix
                }
                playerGames: games(
                  where: { gamePlayerMemberships: { some: { gamePlayer: { id: { equals: $playerId } } } } }
                  orderBy: { playedAt: desc }
                  take: 100
                ) {
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
                  round
                  visualCode
                  linkId
                  linkType
                  gamePlayerMemberships {
                    id
                    team
                    gamePlayer {
                      id
                      firstName
                      lastName
                      fullName
                    }
                  }
                  draw {
                    id
                    name
                    type
                    subEvent {
                      id
                      name
                      eventType
                      gameType
                      level
                      tournament {
                        id
                        name
                        slug
                        visualCode
                        startDate
                        endDate
                      }
                    }
                  }
                }
                playerEntries: entries(
                  where: { OR: [{ player1Id: { equals: $playerId } }, { player2Id: { equals: $playerId } }] }
                  orderBy: { createdAt: desc }
                ) {
                  id
                  player1Id
                  player2Id
                  teamId
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
                  }
                  draw {
                    id
                    name
                    type
                    size
                    visualCode
                    subEvent {
                      id
                      name
                      eventType
                      gameType
                      level
                      visualCode
                      tournament {
                        id
                        name
                        slug
                        visualCode
                        startDate
                        endDate
                        state
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              playerId: params.playerId,
            },
            context: { signal: abortSignal },
          }),
        );

        if (!result?.data.player) {
          throw new Error('Player not found');
        }

        const player = result.data.player;
        const games = result.data.playerGames || [];
        const entries = result.data.playerEntries || [];

        // Calculate statistics
        const statistics = this.calculateStatistics(player, games, entries);

        // Group tournament history
        const tournamentHistory = this.groupTournamentHistory(entries, games);

        // Recent games (last 20)
        const recentGames = games.slice(0, 20);

        return {
          player,
          statistics,
          tournamentHistory,
          recentGames,
          allGames: games,
        };
      } catch (err) {
        console.error('Error loading player details:', err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  player = computed(() => this.dataResource.value()?.player);
  statistics = computed(() => this.dataResource.value()?.statistics);
  tournamentHistory = computed(() => this.dataResource.value()?.tournamentHistory ?? []);
  recentGames = computed(() => this.dataResource.value()?.recentGames ?? []);
  allGames = computed(() => this.dataResource.value()?.allGames ?? []);
  error = computed(() => this.dataResource.error()?.message || null);
  loading = computed(() => this.dataResource.isLoading());

  private calculateStatistics(player: Player, games: Game[], entries: Entry[]): PlayerStatistics {
    let totalGames = 0;
    let gamesWon = 0;
    let gamesLost = 0;
    let setsWon = 0;
    let setsLost = 0;
    let pointsWon = 0;
    let pointsLost = 0;

    // Calculate from games
    games.forEach((game) => {
      if (game.status !== 'NORMAL') return;

      const playerTeam = this.getPlayerTeam(game, player.id);
      if (playerTeam === null) return;

      totalGames++;

      // Determine if player won
      const isWinner = game.winner === playerTeam;
      if (isWinner) {
        gamesWon++;
      } else {
        gamesLost++;
      }

      // Count sets and points
      const sets = [
        { team1: game.set1Team1, team2: game.set1Team2 },
        { team1: game.set2Team1, team2: game.set2Team2 },
        { team1: game.set3Team1, team2: game.set3Team2 },
      ].filter((set) => set.team1 !== null && set.team2 !== null);

      sets.forEach((set) => {
        const playerPoints = playerTeam === 1 ? set.team1! : set.team2!;
        const opponentPoints = playerTeam === 1 ? set.team2! : set.team1!;

        pointsWon += playerPoints;
        pointsLost += opponentPoints;

        if (playerPoints > opponentPoints) {
          setsWon++;
        } else {
          setsLost++;
        }
      });
    });

    // Calculate tournament statistics
    const tournaments = new Set(entries.map((entry) => entry.tournamentDraw?.tournamentSubEvent?.tournamentEvent?.id)).size;

    const positions = entries.filter((entry) => entry.standing?.position).map((entry) => entry.standing!.position);

    const avgPosition = positions.length > 0 ? positions.reduce((sum, pos) => sum + pos, 0) / positions.length : 0;

    const bestPosition = positions.length > 0 ? Math.min(...positions) : 0;

    return {
      totalGames,
      gamesWon,
      gamesLost,
      winRate: totalGames > 0 ? (gamesWon / totalGames) * 100 : 0,
      setsWon,
      setsLost,
      setWinRate: setsWon + setsLost > 0 ? (setsWon / (setsWon + setsLost)) * 100 : 0,
      pointsWon,
      pointsLost,
      pointWinRate: pointsWon + pointsLost > 0 ? (pointsWon / (pointsWon + pointsLost)) * 100 : 0,
      tournaments,
      avgPosition,
      bestPosition,
    };
  }

  private groupTournamentHistory(entries: Entry[], games: Game[]): PlayerTournamentHistory[] {
    const historyMap = new Map<string, PlayerTournamentHistory>();

    entries.forEach((entry) => {
      const key = `${entry.tournamentDraw?.tournamentSubEvent?.tournamentEvent?.id}-${entry.tournamentDraw?.tournamentSubEvent?.id}-${entry.tournamentDraw?.id}`;

      if (!historyMap.has(key)) {
        historyMap.set(key, {
          tournament: entry.tournamentDraw?.tournamentSubEvent?.tournamentEvent,
          subEvent: entry.tournamentDraw?.tournamentSubEvent,
          draw: entry.tournamentDraw,
          entry,
          games: [],
          finalPosition: entry.standing?.position,
        });
      }
    });

    // Add games to respective tournaments
    games.forEach((game) => {
      if (game.tournamentDraw?.tournamentSubEvent?.tournamentEvent) {
        const key = `${game.tournamentDraw?.tournamentSubEvent?.tournamentEvent?.id}-${game.tournamentDraw?.tournamentSubEvent?.id}-${game.tournamentDraw?.id}`;
        const history = historyMap.get(key);
        if (history) {
          history.games?.push(game);
        }
      }
    });

    return Array.from(historyMap.values()).sort(
      (a, b) => new Date(b.tournament?.firstDay || 0).getTime() - new Date(a.tournament?.firstDay || 0).getTime(),
    );
  }

  private getPlayerTeam(game: Game, playerId: string): number | null {
    const membership = game.gamePlayerMemberships?.find((gpm) => gpm.gamePlayer.id === playerId);
    return membership ? (membership.team ?? null) : null;
  }

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404) {
      return 'Player not found';
    }
    return err.statusText || 'An error occurred while loading player data';
  }
}
