import {
  CompetitionDraw,
  CompetitionEncounter,
  CompetitionEvent,
  CompetitionSubEvent,
  Entry,
  Player,
  RankingLastPlace,
  RankingPlace,
  RankingSystem,
  Standing,
  Team,
} from '@app/models';
import { SubEventTypeEnum } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { Between, In } from 'typeorm';
import { AssemblyInput } from '../../inputs/assembly.input';
import { AssemblyOutput, AssemblyValidationError, PlayerRankingType } from './assembly-output';
import {
  EntryCompetitionPlayer,
  EntryMeta,
  PlayerWithRanking,
  ValidationData,
} from './assembly-validation.types';
import {
  Rule,
  PlayerCompStatusRule,
  PlayerGenderRule,
  PlayerMaxGamesRule,
  PlayerMinLevelRule,
  PlayerOrderRule,
  TeamBaseIndexRule,
  TeamClubBaseRule,
  TeamSubeventIndexRule,
  TeamSubtitudesRule,
} from './rules';

@Injectable()
export class AssemblyValidationService {
  private readonly logger = new Logger(AssemblyValidationService.name);
  private readonly rules: Rule[] = [];

  constructor() {
    this.rules = [
      new PlayerCompStatusRule(),
      new PlayerGenderRule(),
      new PlayerMaxGamesRule(),
      new PlayerMinLevelRule(),
      new PlayerOrderRule(),
      new TeamBaseIndexRule(),
      new TeamClubBaseRule(),
      new TeamSubeventIndexRule(),
      new TeamSubtitudesRule(),
    ];
  }

  async validate(input: AssemblyInput): Promise<AssemblyOutput> {
    try {
      const data = await this.fetchData(input);
      const allErrors: AssemblyValidationError[] = [];
      const allWarnings: AssemblyValidationError[] = [];

      // Run all validation rules
      const results = await Promise.all(this.rules.map((rule) => rule.validate(data)));

      for (const result of results) {
        if (result.errors) allErrors.push(...result.errors);
        if (result.warnings) allWarnings.push(...result.warnings);
      }

      // Calculate titulars index
      const titulars = this.getBestPlayersFromTeam(data.type as SubEventTypeEnum, data);

      return {
        valid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        titularsIndex: titulars.index,
        titularsPlayers: titulars.players,
        baseTeamIndex: data.meta?.competition?.teamIndex,
        basePlayersData: data.meta?.competition?.players?.map((p) => ({ id: p.id })),
        systemId: data.system?.id,
      };
    } catch (err) {
      this.logger.error('Validation failed', err);
      return {
        valid: false,
        errors: [{ message: 'all.v1.teamFormation.errors.validation-failed', params: { error: String(err) } }],
        warnings: [],
      };
    }
  }

  async fetchData(args: AssemblyInput): Promise<ValidationData> {
    const idPlayers = [
      args.single1,
      args.single2,
      args.single3,
      args.single4,
      ...(args.double1?.flat(1) ?? []),
      ...(args.double2?.flat(1) ?? []),
      ...(args.double3?.flat(1) ?? []),
      ...(args.double4?.flat(1) ?? []),
    ].filter((p): p is string => p != null);

    const idSubs = args.subtitudes?.filter((p): p is string => p != null) ?? [];

    // Load team, encounter, system in parallel
    const [team, encounter, system] = await Promise.all([
      Team.findOneOrFail({ where: { id: args.teamId } }),
      args.encounterId ? CompetitionEncounter.findOne({ where: { id: args.encounterId } }) : Promise.resolve(null),
      args.systemId
        ? RankingSystem.findOne({ where: { id: args.systemId } })
        : RankingSystem.findActiveSystem(),
    ]);

    if (!team?.season || !team.clubId || !team.type) {
      throw new Error('Team not found or missing required fields');
    }
    if (!system) {
      throw new Error('System not found');
    }

    // Get draw and subevent
    const { draw, subEvent } = await this.getDrawAndSubEvent(encounter ?? undefined, team);
    if (!subEvent) {
      throw new Error('SubEvent not found');
    }

    const event = await CompetitionEvent.findOne({
      where: { id: subEvent.eventId! },
    });
    if (!event) {
      throw new Error('Event not found');
    }
    if (!event.usedRankingUnit || !event.usedRankingAmount) {
      throw new Error('EventCompetition usedRankingUnit is not set');
    }

    // Get previous season team
    const previousSeasonTeam = await Team.findOne({
      where: { link: team.link, season: team.season - 1 },
      relations: ['entries', 'entries.standing'],
    });

    // Get all same-season sub events
    const sameYearEvents = await CompetitionEvent.find({
      where: { season: event.season },
      relations: ['competitionSubEvents'],
    });
    const subEventIds = sameYearEvents
      .flatMap((e) => e.competitionSubEvents?.map((s) => s.id) ?? []);

    // Get club teams of same type
    const clubTeams = await Team.find({
      where: { clubId: team.clubId, type: team.type, season: event.season },
    });

    // Get memberships (entries)
    const memberships = await Entry.find({
      where: {
        teamId: In(clubTeams.map((t) => t.id)),
        subEventId: In(subEventIds),
      },
    });

    // Filter memberships: lower-numbered teams + same subevent
    const filteredMemberships = memberships.filter((m) => {
      const t = clubTeams.find((ct) => ct.id === m.teamId);
      return (t?.teamNumber ?? 0) <= (team.teamNumber ?? 0) || m.subEventId === subEvent.id;
    });

    // Process meta data
    let meta: EntryMeta = filteredMemberships.find((m) => m.teamId === args.teamId)?.meta as EntryMeta ?? {};
    if (!meta?.competition) {
      meta.competition = { players: [] };
    }
    meta.competition.players = this.getBestPlayers(
      team.type as SubEventTypeEnum,
      meta.competition.players ?? [],
    );

    const otherMeta = filteredMemberships
      .filter((m) => m.teamId !== args.teamId)
      .map((m) => m.meta as EntryMeta)
      .filter(Boolean);

    // Calculate ranking date range
    const year = event.season;
    const rankingDate = new Date();
    rankingDate.setFullYear(year);
    if (event.usedRankingUnit === 'months') {
      rankingDate.setMonth(event.usedRankingAmount);
    } else if (event.usedRankingUnit === 'weeks') {
      rankingDate.setDate(rankingDate.getDate() + event.usedRankingAmount * 7);
    }
    const startRanking = new Date(rankingDate.getFullYear(), rankingDate.getMonth(), 1);
    const endRanking = new Date(rankingDate.getFullYear(), rankingDate.getMonth() + 1, 0, 23, 59, 59);

    // Fetch players with rankings
    const allPlayerIds = [...new Set([...idPlayers, ...idSubs])];
    const playerMap = new Map<string, PlayerWithRanking>();

    if (allPlayerIds.length > 0) {
      const players = await Player.find({
        where: { id: In(allPlayerIds) },
      });

      // Load rankings for each player
      for (const player of players) {
        const [lastPlaces, rankingPlaces] = await Promise.all([
          RankingLastPlace.find({
            where: { playerId: player.id, systemId: system.id },
          }),
          RankingPlace.find({
            where: {
              playerId: player.id,
              systemId: system.id,
              rankingDate: Between(startRanking, endRanking),
            },
            order: { rankingDate: 'DESC' },
            take: 1,
          }),
        ]);

        const playerWithRanking = player as PlayerWithRanking;
        playerWithRanking.rankingLastPlaces = lastPlaces;
        playerWithRanking.rankingPlaces = rankingPlaces;
        playerMap.set(player.id, playerWithRanking);
      }
    }

    const getPlayer = (id?: string) => id ? playerMap.get(id) : undefined;
    const getPlayers = (ids?: string[]) => (ids ?? []).map((id) => playerMap.get(id)).filter(Boolean) as PlayerWithRanking[];

    // Calculate team index from titulars
    const playersWithRankings = idPlayers
      .map((id) => playerMap.get(id))
      .filter(Boolean)
      .map((p) => ({
        id: p!.id,
        gender: p!.gender as 'M' | 'F',
        single: p!.rankingLastPlaces?.[0]?.single ?? system.amountOfLevels ?? 12,
        double: p!.rankingLastPlaces?.[0]?.double ?? system.amountOfLevels ?? 12,
        mix: p!.rankingLastPlaces?.[0]?.mix ?? system.amountOfLevels ?? 12,
      }));

    const titularsResult = this.getBestPlayersFromTeamRaw(team.type as SubEventTypeEnum, playersWithRankings);

    return {
      type: team.type,
      meta,
      otherMeta,
      teamIndex: titularsResult.index,
      teamPlayers: idPlayers.map((id) => playerMap.get(id)).filter(Boolean) as PlayerWithRanking[],
      encounter: encounter ?? undefined,
      draw: draw ?? undefined,
      subEvent,
      event,
      team,
      previousSeasonTeam,
      system,
      single1: getPlayer(args.single1),
      single2: getPlayer(args.single2),
      single3: getPlayer(args.single3),
      single4: getPlayer(args.single4),
      double1: this.sortPlayersByRanking(getPlayers(args.double1), system, 'double') as [PlayerWithRanking, PlayerWithRanking],
      double2: this.sortPlayersByRanking(getPlayers(args.double2), system, 'double') as [PlayerWithRanking, PlayerWithRanking],
      double3: this.sortPlayersByRanking(
        getPlayers(args.double3),
        system,
        team.type === SubEventTypeEnum.MX ? 'mix' : 'double',
      ) as [PlayerWithRanking, PlayerWithRanking],
      double4: this.sortPlayersByRanking(
        getPlayers(args.double4),
        system,
        team.type === SubEventTypeEnum.MX ? 'mix' : 'double',
      ) as [PlayerWithRanking, PlayerWithRanking],
      subtitudes: getPlayers(idSubs),
    };
  }

  private async getDrawAndSubEvent(
    encounter: CompetitionEncounter | undefined,
    team: Team,
  ): Promise<{ draw: CompetitionDraw | null; subEvent: CompetitionSubEvent | null }> {
    if (encounter) {
      const draw = await CompetitionDraw.findOne({
        where: { id: encounter.drawId! },
      });
      const subEvent = draw
        ? await CompetitionSubEvent.findOne({ where: { id: draw.subeventId! } })
        : null;
      return { draw, subEvent };
    }

    // If no encounter, try to get from team's entry
    const entry = team.entries?.[0]
      ?? await Entry.findOne({ where: { teamId: team.id } });
    if (entry) {
      const draw = entry.drawId
        ? await CompetitionDraw.findOne({ where: { id: entry.drawId } })
        : null;
      const subEvent = entry.subEventId
        ? await CompetitionSubEvent.findOne({ where: { id: entry.subEventId } })
        : null;
      return { draw, subEvent };
    }

    return { draw: null, subEvent: null };
  }

  // --- Utility functions ---

  private getBestPlayers(type: SubEventTypeEnum, players: EntryCompetitionPlayer[]): EntryCompetitionPlayer[] {
    const defaultLevel = 12;
    if (type !== SubEventTypeEnum.MX) {
      return [...players]
        .sort((a, b) => {
          const aSum = (a.single ?? defaultLevel) + (a.double ?? defaultLevel) + (a.mix ?? defaultLevel);
          const bSum = (b.single ?? defaultLevel) + (b.double ?? defaultLevel) + (b.mix ?? defaultLevel);
          return aSum - bSum;
        })
        .slice(0, 4);
    }

    const males = [...players]
      .filter((p) => p.gender === 'M')
      .sort((a, b) => {
        const aSum = (a.single ?? defaultLevel) + (a.double ?? defaultLevel) + (a.mix ?? defaultLevel);
        const bSum = (b.single ?? defaultLevel) + (b.double ?? defaultLevel) + (b.mix ?? defaultLevel);
        return aSum - bSum;
      })
      .slice(0, 2);

    const females = [...players]
      .filter((p) => p.gender === 'F')
      .sort((a, b) => {
        const aSum = (a.single ?? defaultLevel) + (a.double ?? defaultLevel) + (a.mix ?? defaultLevel);
        const bSum = (b.single ?? defaultLevel) + (b.double ?? defaultLevel) + (b.mix ?? defaultLevel);
        return aSum - bSum;
      })
      .slice(0, 2);

    return [...males, ...females];
  }

  private getBestPlayersFromTeamRaw(
    type: SubEventTypeEnum,
    rankings: { id: string; gender: 'M' | 'F'; single: number; double: number; mix: number }[],
  ): { players: { id: string; single: number; double: number; mix: number }[]; index: number } {
    const best = this.getBestPlayers(type, rankings.map((r) => ({ ...r })));
    if (type !== SubEventTypeEnum.MX) {
      const sums = best.map((r) => (r.single ?? 12) + (r.double ?? 12));
      const missing = (4 - best.length) * 24;
      return { players: best as any, index: sums.reduce((a, b) => a + b, missing) };
    }
    const sums = best.map((r) => (r.single ?? 12) + (r.double ?? 12) + (r.mix ?? 12));
    const missing = (4 - best.length) * 36;
    return { players: best as any, index: sums.reduce((a, b) => a + b, missing) };
  }

  private getBestPlayersFromTeam(
    type: SubEventTypeEnum,
    data: ValidationData,
  ): { index: number; players: PlayerRankingType[] } {
    const defaultLevel = data.system?.amountOfLevels ?? 12;
    const allPlayers = [
      data.single1,
      data.single2,
      data.single3,
      data.single4,
      ...(data.double1 ?? []),
      ...(data.double2 ?? []),
      ...(data.double3 ?? []),
      ...(data.double4 ?? []),
    ].filter(Boolean) as PlayerWithRanking[];

    const uniquePlayers = [...new Map(allPlayers.map((p) => [p.id, p])).values()];
    const rankings = uniquePlayers.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: (p.gender ?? 'M') as 'M' | 'F',
      single: p.rankingLastPlaces?.[0]?.single ?? defaultLevel,
      double: p.rankingLastPlaces?.[0]?.double ?? defaultLevel,
      mix: p.rankingLastPlaces?.[0]?.mix ?? defaultLevel,
    }));

    const result = this.getBestPlayersFromTeamRaw(type, rankings);
    return {
      index: result.index,
      players: result.players.map((p: any) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        single: p.single,
        double: p.double,
        mix: p.mix,
      })),
    };
  }

  private sortPlayersByRanking(
    players: PlayerWithRanking[],
    system: RankingSystem,
    rankingType: 'single' | 'double' | 'mix',
  ): PlayerWithRanking[] {
    return players.sort((a, b) => {
      const rankingA = a.rankingLastPlaces?.[0]?.[rankingType] ?? (system.amountOfLevels ?? 12);
      const rankingB = b.rankingLastPlaces?.[0]?.[rankingType] ?? (system.amountOfLevels ?? 12);
      return rankingA - rankingB;
    });
  }
}
