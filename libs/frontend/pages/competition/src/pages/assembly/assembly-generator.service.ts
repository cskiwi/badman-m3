import { inject, Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { AssemblyService } from './page-assembly.service';
import { GameRecord, HistoryData, OccupiedSlots, SlotAssignment } from './strategies/assembly-strategy.types';
import { generateVariations } from './strategies/variations.strategy';
import { generateBestResults } from './strategies/best-results.strategy';
import { generateRandom } from './strategies/random.strategy';

export type GenerateStrategy = 'variations' | 'best-results' | 'random';
export type TimeRange = 'season' | 'last-season' | 'last-weeks';

export interface GenerateOptions {
  strategy: GenerateStrategy;
  timeRange: TimeRange;
  weeks?: number;
}

const TEAM_HISTORY_QUERY = gql`
  query TeamAssemblyHistory($args: CompetitionEncounterArgs) {
    competitionEncounters(args: $args) {
      id
      date
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
    }
  }
`;

@Injectable()
export class AssemblyGeneratorService {
  private readonly apollo = inject(Apollo);
  private readonly assemblyService = inject(AssemblyService);

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

  private async loadHistory(options: GenerateOptions): Promise<HistoryData> {
    const teamId = this.assemblyService.formGroup.get('team')?.value;
    const season = this.assemblyService.formGroup.get('season')?.value;
    if (!teamId) return { assemblies: [], games: [] };

    const where: Record<string, unknown>[] = [{ OR: [{ homeTeamId: { eq: teamId } }, { awayTeamId: { eq: teamId } }] }];

    if (options.timeRange === 'last-weeks' && options.weeks) {
      const since = new Date();
      since.setDate(since.getDate() - options.weeks * 7);
      where.push({ date: { gte: since.toISOString() } });
    } else if (options.timeRange === 'last-season' && season) {
      where.push({
        drawCompetition: {
          competitionSubEvent: {
            competitionEvent: { season: { eq: season - 1 } },
          },
        },
      });
    }

    try {
      const result = await lastValueFrom(
        this.apollo.query<{ competitionEncounters: Record<string, unknown>[] }>({
          query: TEAM_HISTORY_QUERY,
          variables: { args: { where, order: { date: 'DESC' } } },
          fetchPolicy: 'network-only',
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
            const ourTeamNumber = encObj['homeTeamId'] === this.assemblyService.formGroup.get('team')?.value ? 1 : 2;
            const ourPlayers = memberships.filter((m) => m['team'] === ourTeamNumber);

            if (ourPlayers.length > 0) {
              games.push({
                gameType: (game['gameType'] as string) ?? (game['order'] as number)?.toString() ?? '',
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
