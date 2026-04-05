import { inject, Injectable, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { AssemblyService, PlayerWithRanking } from './page-assembly.service';
import { GameRecord, HistoryData, OccupiedSlots, SlotAssignment } from './strategies/assembly-strategy.types';
import { generateVariations } from './strategies/variations.strategy';
import { generateBestResults } from './strategies/best-results.strategy';
import { generateRandom } from './strategies/random.strategy';
import { pairKey } from './strategies/assembly-helpers';

export type GenerateStrategy = 'variations' | 'best-results' | 'random';
export type TimeRange = 'both-seasons' | 'season' | 'last-season' | 'last-weeks';

export interface GenerateOptions {
  strategy: GenerateStrategy;
  timeRange: TimeRange;
  weeks?: number;
}

export interface PlayerStat {
  playerId: string;
  wins: number;
  total: number;
  winPct: number;
}

export interface PairStat {
  player1: PlayerWithRanking;
  player2: PlayerWithRanking;
  wins: number;
  total: number;
  winPct: number;
}

export interface SlotStat {
  wins: number;
  total: number;
  winPct: number;
}

export interface SlotPairStat {
  wins: number;
  total: number;
  winPct: number;
}

const ENCOUNTER_FIELDS = `
  id
  date
  homeTeam {
    id
    link
  }
  awayTeam {
    id
    link
  }
  assemblies {
    id
    assembly
  }
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
      id
      playerId
      team
    }
  }
`;

const TEAM_HISTORY_QUERY = gql`
  query TeamAssemblyHistory($linkId: String!) {
    competitionEncounters(args: { where: [{ OR: [{ homeTeam: { link: { eq: $linkId } } }, { awayTeam: { link: { eq: $linkId } } }] }] }) {
      ${ENCOUNTER_FIELDS}
    }
  }
`;

const TEAM_HISTORY_SINCE_QUERY = gql`
  query TeamAssemblyHistorySince($linkId: String!, $since: DateTime!) {
    competitionEncounters(args: { where: [{ OR: [{ homeTeam: { link: { eq: $linkId } }, date: { gte: $since } }, { awayTeam: { link: { eq: $linkId } }, date: { gte: $since } }] }] }) {
      ${ENCOUNTER_FIELDS}
    }
  }
`;

const TEAM_HISTORY_SEASON_QUERY = gql`
  query TeamAssemblyHistoryLastSeason($linkId: String!, $season: Float!) {
    competitionEncounters(args: { where: [{ OR: [{ homeTeam: { link: { eq: $linkId } }, drawCompetition: { competitionSubEvent: { competitionEvent: { season: { eq: $season } } } } }, { awayTeam: { link: { eq: $linkId } }, drawCompetition: { competitionSubEvent: { competitionEvent: { season: { eq: $season } } } } }] }] }) {
      ${ENCOUNTER_FIELDS}
    }
  }
`;

const TEAM_HISTORY_BOTH_SEASONS_QUERY = gql`
  query TeamAssemblyHistoryBothSeasons($linkId: String!, $season: Float!, $lastSeason: Float!) {
    competitionEncounters(args: { where: [{ OR: [{ homeTeam: { link: { eq: $linkId } }, drawCompetition: { competitionSubEvent: { competitionEvent: { season: { in: [$season, $lastSeason] } } } } }, { awayTeam: { link: { eq: $linkId } }, drawCompetition: { competitionSubEvent: { competitionEvent: { season: { in: [$season, $lastSeason] } } } } }] }] }) {
      ${ENCOUNTER_FIELDS}
    }
  }
`;

@Injectable()
export class AssemblyGeneratorService {
  private readonly apollo = inject(Apollo);
  private readonly assemblyService = inject(AssemblyService);

  /** Per-player stats: playerId → { wins, total, winPct } */
  readonly playerStats = signal<Map<string, PlayerStat>>(new Map());

  /** Per-pair stats: pairKey → PairStat */
  readonly pairStats = signal<PairStat[]>([]);

  /** Per-slot-type stats: slotId → SlotStat */
  readonly slotStats = signal<Map<string, SlotStat>>(new Map());

  /** Per-slot pair stats: slotId → pairKey → SlotPairStat */
  readonly slotPairStats = signal<Map<string, Map<string, SlotPairStat>>>(new Map());

  /** Total pair stats across all slots: pairKey → SlotPairStat */
  readonly totalPairStats = signal<Map<string, SlotPairStat>>(new Map());

  /** Whether stats are currently loading */
  readonly loadingStats = signal(false);

  async loadStats(timeRange: TimeRange, weeks?: number, forceRefresh = false): Promise<void> {
    this.loadingStats.set(true);
    try {
      const history = await this.loadHistory(
        { strategy: 'variations', timeRange, weeks },
        forceRefresh ? 'network-only' : 'cache-first',
      );
      const players = [
        ...this.assemblyService.players()['REGULAR'],
        ...this.assemblyService.players()['BACKUP'],
      ];
      this.computeStats(history, players);
    } finally {
      this.loadingStats.set(false);
    }
  }

  private computeStats(history: HistoryData, players: PlayerWithRanking[]) {
    const eventType = this.assemblyService.type();
    const orderToSlot = this.getOrderToSlotMapping(eventType);

    const playerMap = new Map<string, PlayerStat>();
    const pairMap = new Map<string, { player1: PlayerWithRanking; player2: PlayerWithRanking; wins: number; total: number }>();
    const slotMap = new Map<string, { wins: number; total: number }>();
    const slotPairMap = new Map<string, Map<string, { wins: number; total: number }>>();
    const totalPairMap = new Map<string, { wins: number; total: number }>();
    const playerLookup = new Map(players.map((p) => [p.id, p]));

    for (const game of history.games) {
      // Map game order to slot ID
      const slotId = orderToSlot[game.gameOrder] ?? `unknown-${game.gameOrder}`;

      // Slot/game type stats
      const slotEntry = slotMap.get(slotId) ?? { wins: 0, total: 0 };
      slotEntry.total++;
      if (game.won) slotEntry.wins++;
      slotMap.set(slotId, slotEntry);

      // Player stats
      for (const pid of [game.player1Id, game.player2Id]) {
        if (!pid) continue;
        const entry = playerMap.get(pid) ?? { playerId: pid, wins: 0, total: 0, winPct: 0 };
        entry.total++;
        if (game.won) entry.wins++;
        playerMap.set(pid, entry);
      }

      // Pair stats (doubles only)
      if (game.player1Id && game.player2Id) {
        const key = pairKey(game.player1Id, game.player2Id);
        const p1 = playerLookup.get(game.player1Id);
        const p2 = playerLookup.get(game.player2Id);
        if (p1 && p2) {
          const entry = pairMap.get(key) ?? { player1: p1, player2: p2, wins: 0, total: 0 };
          entry.total++;
          if (game.won) entry.wins++;
          pairMap.set(key, entry);
        }

        // Per-slot pair stats
        let slotPairs = slotPairMap.get(slotId);
        if (!slotPairs) {
          slotPairs = new Map();
          slotPairMap.set(slotId, slotPairs);
        }
        const slotPairEntry = slotPairs.get(key) ?? { wins: 0, total: 0 };
        slotPairEntry.total++;
        if (game.won) slotPairEntry.wins++;
        slotPairs.set(key, slotPairEntry);

        // Total pair stats (across all slots)
        const totalEntry = totalPairMap.get(key) ?? { wins: 0, total: 0 };
        totalEntry.total++;
        if (game.won) totalEntry.wins++;
        totalPairMap.set(key, totalEntry);
      }
    }

    // Compute win percentages
    for (const stat of playerMap.values()) {
      stat.winPct = stat.total > 0 ? Math.round((stat.wins / stat.total) * 100) : 0;
    }

    const pairStats: PairStat[] = [];
    for (const entry of pairMap.values()) {
      pairStats.push({
        ...entry,
        winPct: entry.total > 0 ? Math.round((entry.wins / entry.total) * 100) : 0,
      });
    }

    const slotStats = new Map<string, SlotStat>();
    for (const [gt, entry] of slotMap) {
      slotStats.set(gt, {
        ...entry,
        winPct: entry.total > 0 ? Math.round((entry.wins / entry.total) * 100) : 0,
      });
    }

    this.playerStats.set(playerMap);
    this.pairStats.set(pairStats.sort((a, b) => b.total - a.total));
    this.slotStats.set(slotStats);

    // Finalize per-slot pair stats
    const finalSlotPairStats = new Map<string, Map<string, SlotPairStat>>();
    for (const [sid, pairs] of slotPairMap) {
      const pairStatMap = new Map<string, SlotPairStat>();
      for (const [key, entry] of pairs) {
        pairStatMap.set(key, {
          ...entry,
          winPct: entry.total > 0 ? Math.round((entry.wins / entry.total) * 100) : 0,
        });
      }
      finalSlotPairStats.set(sid, pairStatMap);
    }
    this.slotPairStats.set(finalSlotPairStats);

    // Finalize total pair stats
    const finalTotalPairStats = new Map<string, SlotPairStat>();
    for (const [key, entry] of totalPairMap) {
      finalTotalPairStats.set(key, {
        ...entry,
        winPct: entry.total > 0 ? Math.round((entry.wins / entry.total) * 100) : 0,
      });
    }
    this.totalPairStats.set(finalTotalPairStats);
  }

  /**
   * Maps game order numbers to slot IDs based on event type.
   * Belgian badminton standard order:
   * - MX: HD, DD, HE1, DE1, HE2, DE2, GD1, GD2
   * - M/F: D1, D2, E1, E2, E3, D3, E4, D4
   */
  private getOrderToSlotMapping(eventType: string | undefined): Record<number, string> {
    if (eventType === 'MX') {
      return {
        1: 'double1',  // HD
        2: 'double2',  // DD
        3: 'single1',  // HE1
        4: 'single3',  // DE1
        5: 'single2',  // HE2
        6: 'single4',  // DE2
        7: 'double3',  // GD1
        8: 'double4',  // GD2
      };
    }
    // M or F events
    return {
      1: 'double1',  // D1
      2: 'double2',  // D2
      3: 'single1',  // E1
      4: 'single2',  // E2
      5: 'single3',  // E3
      6: 'double3',  // D3
      7: 'single4',  // E4
      8: 'double4',  // D4
    };
  }

  async generate(options: GenerateOptions): Promise<void> {
    const availablePlayers = this.assemblyService.availablePlayers();
    const type = this.assemblyService.type();

    if (availablePlayers.length === 0 || !type) return;

    const occupied = this.getOccupiedSlots();
    const existingDoubles = [
      this.assemblyService.double1(),
      this.assemblyService.double2(),
      this.assemblyService.double3(),
      this.assemblyService.double4(),
    ];
    const preAssignedCounts = this.getPreAssignedGameCounts();

    let assignment: SlotAssignment;

    switch (options.strategy) {
      case 'variations': {
        const history = await this.loadHistory(options);
        assignment = generateVariations(availablePlayers, type, history, occupied, existingDoubles, preAssignedCounts);
        break;
      }
      case 'best-results': {
        const history = await this.loadHistory(options);
        assignment = generateBestResults(availablePlayers, type, history, occupied, existingDoubles, preAssignedCounts);
        break;
      }
      case 'random':
        assignment = generateRandom(availablePlayers, type, occupied, existingDoubles, preAssignedCounts);
        break;
    }

    this.applyAssignment(assignment);
  }

  private getOccupiedSlots(): OccupiedSlots {
    const ds = this.assemblyService;
    const preAssignedSingleIds = new Set<string>();
    for (const data of [ds.single1(), ds.single2(), ds.single3(), ds.single4()]) {
      for (const p of data) preAssignedSingleIds.add(p.id);
    }
    return {
      single1: ds.single1().length > 0,
      single2: ds.single2().length > 0,
      single3: ds.single3().length > 0,
      single4: ds.single4().length > 0,
      double1: ds.double1().length > 0,
      double2: ds.double2().length > 0,
      double3: ds.double3().length > 0,
      double4: ds.double4().length > 0,
      preAssignedSingleIds,
    };
  }

  /**
   * Count how many games each player already has from pre-assigned slots.
   */
  private getPreAssignedGameCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    const ds = this.assemblyService;

    const addPlayer = (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1);

    // Singles
    for (const data of [ds.single1(), ds.single2(), ds.single3(), ds.single4()]) {
      for (const p of data) addPlayer(p.id);
    }
    // Doubles
    for (const data of [ds.double1(), ds.double2(), ds.double3(), ds.double4()]) {
      for (const p of data) addPlayer(p.id);
    }

    return counts;
  }

  private async loadHistory(options: GenerateOptions, fetchPolicy: 'network-only' | 'cache-first' = 'network-only'): Promise<HistoryData> {
    const team = this.assemblyService.team();
    const season = this.assemblyService.formGroup.get('season')?.value;
    if (!team?.link) return { assemblies: [], games: [] };

    const linkId = team.link;

    // Select the right query and variables based on time range
    let query = TEAM_HISTORY_QUERY;
    let variables: Record<string, unknown> = { linkId };

    if (options.timeRange === 'last-weeks' && options.weeks) {
      const since = new Date();
      since.setDate(since.getDate() - options.weeks * 7);
      query = TEAM_HISTORY_SINCE_QUERY;
      variables = { linkId, since: since.toISOString() };
    } else if (options.timeRange === 'last-season' && season) {
      query = TEAM_HISTORY_SEASON_QUERY;
      variables = { linkId, season: season - 1 };
    } else if (options.timeRange === 'both-seasons' && season) {
      query = TEAM_HISTORY_BOTH_SEASONS_QUERY;
      variables = { linkId, season, lastSeason: season - 1 };
    }

    try {
      const result = await lastValueFrom(
        this.apollo.query<{ competitionEncounters: Record<string, unknown>[] }>({
          query,
          variables,
          fetchPolicy,
        }),
      );

      const encounters = result.data?.competitionEncounters ?? [];
      const assemblies: Record<string, unknown>[] = [];
      const games: GameRecord[] = [];

      for (const enc of encounters) {
        const encObj = enc as Record<string, unknown>;
        const encAssemblies = (encObj['assemblies'] as Record<string, unknown>[]) ?? [];
        if (encAssemblies.length) {
          for (const a of encAssemblies) {
            if (a['assembly']) assemblies.push(a['assembly'] as Record<string, unknown>);
          }
        }

        const encGames = (encObj['games'] as Record<string, unknown>[]) ?? [];
        if (encGames.length) {
          for (const game of encGames) {
            const memberships = (game['gamePlayerMemberships'] as Record<string, unknown>[]) ?? [];
            const homeTeam = encObj['homeTeam'] as Record<string, unknown> | undefined;
            const ourTeamNumber = homeTeam?.['link'] === linkId ? 1 : 2;
            const ourPlayers = memberships.filter((m) => m['team'] === ourTeamNumber);

            if (ourPlayers.length > 0) {
              games.push({
                gameType: (game['gameType'] as string) ?? '',
                gameOrder: (game['order'] as number) ?? 0,
                player1Id: ourPlayers[0]?.['playerId'] as string,
                player2Id: ourPlayers[1]?.['playerId'] as string | undefined,
                won: game['winner'] === ourTeamNumber,
                set1Team1: game['set1Team1'] as number | undefined,
                set1Team2: game['set1Team2'] as number | undefined,
                set2Team1: game['set2Team1'] as number | undefined,
                set2Team2: game['set2Team2'] as number | undefined,
                set3Team1: game['set3Team1'] as number | undefined,
                set3Team2: game['set3Team2'] as number | undefined,
              });
            }
          }
        }
      }

      return { assemblies, games };
    } catch {
      return { assemblies: [], games: [] };
    }
  }

  private applyAssignment(assignment: SlotAssignment) {
    const ds = this.assemblyService;

    if (assignment.single1 && ds.single1().length === 0) ds.single1.set([assignment.single1]);
    if (assignment.single2 && ds.single2().length === 0) ds.single2.set([assignment.single2]);
    if (assignment.single3 && ds.single3().length === 0) ds.single3.set([assignment.single3]);
    if (assignment.single4 && ds.single4().length === 0) ds.single4.set([assignment.single4]);
    if (assignment.double1 && ds.double1().length === 0) ds.double1.set([...assignment.double1]);
    if (assignment.double2 && ds.double2().length === 0) ds.double2.set([...assignment.double2]);
    if (assignment.double3 && ds.double3().length === 0) ds.double3.set([...assignment.double3]);
    if (assignment.double4 && ds.double4().length === 0) ds.double4.set([...assignment.double4]);

    ds.syncFormFromSlots();
    ds.validate();
  }
}
