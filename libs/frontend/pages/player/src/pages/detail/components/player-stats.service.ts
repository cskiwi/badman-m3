import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Game, Player } from '@app/models';
import { getSeasonPeriod } from '@app/utils/comp';
import { Apollo, gql } from 'apollo-angular';
import dayjs from 'dayjs';
import { lastValueFrom } from 'rxjs';

export interface PlayerStatsMembership {
  id: string;
  single?: number | null;
  double?: number | null;
  mix?: number | null;
  team?: number | null;
  game?: Partial<Game> | null;
}

export interface StrongestOpponent {
  playerId: string;
  fullName: string;
  level?: number | null;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

export interface FormSample {
  result: 'W' | 'L';
  playedAt?: string | Date | null;
  gameType?: string | null;
}

export interface DisciplineTrend {
  discipline: 'single' | 'double' | 'mix';
  bars: { value: number; result: 'W' | 'L' | 'N' }[];
}

const PLAYER_STATS_QUERY = gql`
  query PlayerStats($playerId: ID!, $args: GamePlayerMembershipArgs) {
    player(id: $playerId) {
      id
      gamePlayerMemberships(args: $args) {
        id
        single
        double
        mix
        team
        game {
          id
          playedAt
          gameType
          winner
          rankingPoints {
            id
            points
            playerId
          }
          gamePlayerMemberships {
            id
            team
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
  }
`;

export class PlayerStatsService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    playerId: new FormControl<string | null>(null),
  });

  private filterSignal = toSignal(this.filter.valueChanges);

  private statsResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.playerId) {
        return [] as PlayerStatsMembership[];
      }

      const [start, end] = getSeasonPeriod();

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ player: Player }>({
            query: PLAYER_STATS_QUERY,
            variables: {
              playerId: params.playerId,
              args: {
                take: 1000,
                where: {
                  game: {
                    set1Team1: { gt: 0 },
                    set1Team2: { gt: 0 },
                    playedAt: {
                      gte: start,
                      lte: end,
                    },
                  },
                },
                order: { game: { playedAt: 'DESC' } },
              },
            },
            context: { signal: abortSignal },
          }),
        );

        return (result?.data?.player?.gamePlayerMemberships ?? []) as PlayerStatsMembership[];
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  loading = computed(() => this.statsResource.isLoading());
  memberships = computed(() => this.statsResource.value() ?? []);

  private won = (m: PlayerStatsMembership) =>
    m.game?.winner != null && m.team != null && m.game.winner === m.team;

  totalGames = computed(() => this.memberships().length);

  wins = computed(() => this.memberships().filter((m) => this.won(m)).length);

  losses = computed(() => this.totalGames() - this.wins());

  winRate = computed(() => {
    const total = this.totalGames();
    if (!total) return 0;
    return Math.round((this.wins() / total) * 100);
  });

  /** Last 10 results, oldest → newest for display */
  form = computed<FormSample[]>(() => {
    const ms = this.memberships().slice(0, 10);
    return ms
      .map((m) => ({
        result: (this.won(m) ? 'W' : 'L') as 'W' | 'L',
        playedAt: m.game?.playedAt ?? null,
        gameType: m.game?.gameType ?? null,
      }))
      .reverse();
  });

  /** Longest win streak over the loaded season. */
  longestStreak = computed(() => {
    // memberships are DESC by date, iterate from oldest
    const arr = [...this.memberships()].reverse();
    let max = 0;
    let run = 0;
    for (const m of arr) {
      if (this.won(m)) {
        run += 1;
        if (run > max) max = run;
      } else {
        run = 0;
      }
    }
    return max;
  });

  thisMonthRecord = computed(() => {
    const start = dayjs().startOf('month');
    const ms = this.memberships().filter((m) =>
      m.game?.playedAt ? dayjs(m.game.playedAt).isAfter(start) : false,
    );
    const wins = ms.filter((m) => this.won(m)).length;
    return { wins, losses: ms.length - wins };
  });

  /** Strongest match-ups — top opponents ordered by absolute record. */
  strongestOpponents = computed<StrongestOpponent[]>(() => {
    const map = new Map<string, StrongestOpponent>();
    const ownPlayerId = this.filter.value.playerId;

    for (const m of this.memberships()) {
      const ownTeam = m.team;
      const game = m.game;
      if (!game || !game.gamePlayerMemberships || ownTeam == null) continue;

      const opponents = game.gamePlayerMemberships.filter(
        (gpm) => gpm.team != null && gpm.team !== ownTeam && gpm.gamePlayer?.id !== ownPlayerId,
      );

      for (const opp of opponents) {
        const id = opp.gamePlayer?.id;
        if (!id) continue;
        const name = opp.gamePlayer?.fullName ?? 'Unknown';
        const existing = map.get(id) ?? {
          playerId: id,
          fullName: name,
          level: this.playerLevelForGame(opp, game.gameType),
          wins: 0,
          losses: 0,
          total: 0,
          winRate: 0,
        };
        if (this.won(m)) existing.wins += 1;
        else existing.losses += 1;
        existing.total += 1;
        map.set(id, existing);
      }
    }

    return Array.from(map.values())
      .filter((o) => o.total >= 2)
      .map((o) => ({ ...o, winRate: o.total ? o.wins / o.total : 0 }))
      .filter((o) => o.winRate < 0.5)
      .sort((a, b) => {
        // Worst winRate first, then most played
        if (a.winRate !== b.winRate) return a.winRate - b.winRate;
        return b.total - a.total;
      })
      .slice(0, 5);
  });

  /** Point deltas for the last N games of each discipline — used for sparkline. */
  trendForDiscipline(discipline: 'single' | 'double' | 'mix', take = 7): DisciplineTrend {
    const ownId = this.filter.value.playerId;
    const typeFilter = { single: 'S', double: 'D', mix: 'MX' }[discipline];
    const ms = this.memberships()
      .filter((m) => m.game?.gameType === typeFilter)
      .slice(0, take)
      .reverse();

    const bars = ms.map((m) => {
      const point = m.game?.rankingPoints?.find((rp) => rp.playerId === ownId);
      const value = point?.points ?? 0;
      const result: 'W' | 'L' | 'N' = this.won(m) ? 'W' : 'L';
      return { value, result };
    });
    return { discipline, bars };
  }

  private playerLevelForGame(gpm: NonNullable<Game['gamePlayerMemberships']>[number], gameType?: string | null): number | null {
    switch (gameType) {
      case 'S':
        return gpm.single ?? null;
      case 'D':
        return gpm.double ?? null;
      case 'MX':
        return gpm.mix ?? null;
      default:
        return null;
    }
  }

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404) return 'Failed to load player stats';
    return err.statusText || 'An error occurred';
  }
}
