import { getRankingProtected } from '@app/backend-ranking';
import { Game, Player, RankingPlace, RankingPoint, RankingSystem } from '@app/models';
import { GameType } from '@app/models-enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { In } from 'typeorm';
import dayjs = require('dayjs');
import {
  JOB_TYPES,
  RANKING_CALC_QUEUE,
  RankingCalcFinalizeJobData,
  RankingCalcInitJobData,
  RankingCalcPeriodJobData,
  RankingCalcPlayerBatchJobData,
} from '../../queues/sync.queue';

const BATCH_SIZE = 100;

@Injectable()
export class RankingCalcService {
  private readonly logger = new Logger(RankingCalcService.name);

  constructor(
    @InjectQueue(RANKING_CALC_QUEUE) private readonly rankingCalcQueue: Queue,
  ) {}

  // ---------------------------------------------------------------------------
  // INIT — determines the lookback window and enqueues one PERIOD job
  // ---------------------------------------------------------------------------

  async processInit(
    job: Job<RankingCalcInitJobData>,
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    await updateProgress(0);
    const { systemId, calcDate, isUpdateDate } = job.data;

    const system = await RankingSystem.findOneOrFail({ where: { id: systemId } });

    if (!system.periodAmount || !system.periodUnit) {
      this.logger.warn(`System ${system.name} has no period configured, skipping`);
      await updateProgress(100);
      return;
    }

    await updateProgress(20);

    const calcDay = dayjs(calcDate);
    const windowStart = calcDay
      .subtract(system.periodAmount, system.periodUnit as dayjs.ManipulateType)
      .toISOString();

    const periodData: RankingCalcPeriodJobData = {
      systemId,
      periodDate: calcDate,
      windowStart,
      windowEnd: calcDate,
      isUpdateDate,
      metadata: {
        displayName: `Ranking period: ${system.name} (${calcDay.format('YYYY-MM-DD')})`,
      },
    };

    await this.rankingCalcQueue.add(JOB_TYPES.RANKING_CALC_PERIOD, periodData, { priority: 15 });
    await updateProgress(100);
    this.logger.log(`Enqueued period job for ${system.name} on ${calcDay.format('YYYY-MM-DD')}`);
  }

  // ---------------------------------------------------------------------------
  // PERIOD — lightweight orchestrator: finds eligible players, splits into batches
  // ---------------------------------------------------------------------------

  async processPeriod(
    job: Job<RankingCalcPeriodJobData>,
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    await updateProgress(0);
    const { systemId, periodDate, windowStart, windowEnd, isUpdateDate } = job.data;

    this.logger.log(`Period orchestrator: ${periodDate} window [${windowStart} → ${windowEnd}]`);

    // Find all competition players who have ranking points in the window
    const rows = await RankingPoint.createQueryBuilder('rp')
      .innerJoin('rp.player', 'p')
      .select('DISTINCT rp.playerId', 'playerId')
      .where('rp.systemId = :systemId', { systemId })
      .andWhere('rp.rankingDate >= :windowStart', { windowStart })
      .andWhere('rp.rankingDate < :windowEnd', { windowEnd })
      .andWhere('p.competitionPlayer = :competition', { competition: true })
      .getRawMany<{ playerId: string }>();

    const playerIds = rows.map((r) => r.playerId);

    if (playerIds.length === 0) {
      this.logger.log('No competition players with ranking points in window, skipping');
      await updateProgress(100);
      return;
    }

    this.logger.log(`Found ${playerIds.length} players to process`);
    await updateProgress(30);

    // Split into batches and store the counter in Redis
    const batches: string[][] = [];
    for (let i = 0; i < playerIds.length; i += BATCH_SIZE) {
      batches.push(playerIds.slice(i, i + BATCH_SIZE));
    }

    const batchKey = `ranking-calc:${systemId}:${periodDate}:remaining`;
    const client = await this.rankingCalcQueue.client;
    await client.set(batchKey, String(batches.length), 'EX', 86400);

    this.logger.log(`Enqueuing ${batches.length} player batches`);

    await Promise.all(
      batches.map((batch, idx) =>
        this.rankingCalcQueue.add(
          JOB_TYPES.RANKING_CALC_PLAYER_BATCH,
          {
            systemId,
            periodDate,
            windowStart,
            windowEnd,
            playerIds: batch,
            isUpdateDate,
            batchKey,
            metadata: {
              displayName: `Player batch ${idx + 1}/${batches.length}`,
            },
          } as RankingCalcPlayerBatchJobData,
          { priority: 20 },
        ),
      ),
    );

    await updateProgress(100);
  }

  // ---------------------------------------------------------------------------
  // PLAYER BATCH — aggregates points and upserts RankingPlace per player
  // ---------------------------------------------------------------------------

  async processPlayerBatch(
    job: Job<RankingCalcPlayerBatchJobData>,
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    await updateProgress(0);
    const { systemId, periodDate, windowStart, windowEnd, playerIds, isUpdateDate, batchKey } = job.data;

    const system = await RankingSystem.findOneOrFail({ where: { id: systemId } });
    await updateProgress(10);

    // --- 1. Aggregate RankingPoints per player per discipline ---
    // Join to Game to get gameType; results already ordered DESC by points
    const pointRows = await RankingPoint.createQueryBuilder('rp')
      .innerJoin(Game, 'g', 'g.id = rp.gameId')
      .select('rp.playerId', 'playerId')
      .addSelect('g.gameType', 'gameType')
      .addSelect('rp.points', 'points')
      .where('rp.systemId = :systemId', { systemId })
      .andWhere('rp.rankingDate >= :windowStart', { windowStart })
      .andWhere('rp.rankingDate < :windowEnd', { windowEnd })
      .andWhere('rp.playerId IN (:...playerIds)', { playerIds })
      .andWhere('rp.points IS NOT NULL')
      .orderBy('rp.playerId')
      .addOrderBy('g.gameType')
      .addOrderBy('rp.points', 'DESC')
      .getRawMany<{ playerId: string; gameType: GameType; points: string }>();

    type DisciplinePoints = { single: number; double: number; mix: number };
    const aggregated = new Map<string, DisciplinePoints>(
      playerIds.map((id) => [id, { single: 0, double: 0, mix: 0 }]),
    );

    const maxGames = system.latestXGamesToUse ?? 10;
    // Group by playerId+gameType, take top maxGames, sum
    const byPlayerAndType = new Map<string, Map<GameType, number[]>>();
    for (const row of pointRows) {
      if (!byPlayerAndType.has(row.playerId)) byPlayerAndType.set(row.playerId, new Map());
      const byType = byPlayerAndType.get(row.playerId)!;
      if (!byType.has(row.gameType)) byType.set(row.gameType, []);
      byType.get(row.gameType)!.push(Number(row.points));
    }

    for (const [playerId, byType] of byPlayerAndType) {
      const agg = aggregated.get(playerId)!;
      for (const [gameType, pts] of byType) {
        const sum = pts.slice(0, maxGames).reduce((a, b) => a + b, 0); // already sorted DESC
        if (gameType === GameType.S) agg.single = sum;
        else if (gameType === GameType.D) agg.double = sum;
        else if (gameType === GameType.MX) agg.mix = sum;
      }
    }

    await updateProgress(30);

    // --- 2. Inactivity check ---
    const inactivityStart =
      system.inactivityAmount && system.inactivityUnit
        ? dayjs(periodDate).subtract(system.inactivityAmount, system.inactivityUnit as dayjs.ManipulateType).toISOString()
        : windowStart;

    const inactivityRows = await RankingPoint.createQueryBuilder('rp')
      .innerJoin(Game, 'g', 'g.id = rp.gameId')
      .select('rp.playerId', 'playerId')
      .addSelect('g.gameType', 'gameType')
      .addSelect('COUNT(*)', 'games')
      .where('rp.systemId = :systemId', { systemId })
      .andWhere('rp.rankingDate >= :start', { start: inactivityStart })
      .andWhere('rp.rankingDate < :end', { end: periodDate })
      .andWhere('rp.playerId IN (:...playerIds)', { playerIds })
      .groupBy('rp.playerId')
      .addGroupBy('g.gameType')
      .getRawMany<{ playerId: string; gameType: GameType; games: string }>();

    const inactivityThreshold = system.gamesForInactivty ?? 0;
    type InactivityFlags = { single: boolean; double: boolean; mix: boolean };
    const inactivity = new Map<string, InactivityFlags>(
      playerIds.map((id) => [id, { single: true, double: true, mix: true }]),
    );
    for (const row of inactivityRows) {
      const flags = inactivity.get(row.playerId)!;
      const count = Number(row.games);
      if (row.gameType === GameType.S) flags.single = count < inactivityThreshold;
      else if (row.gameType === GameType.D) flags.double = count < inactivityThreshold;
      else if (row.gameType === GameType.MX) flags.mix = count < inactivityThreshold;
    }

    await updateProgress(50);

    // --- 3. Most recent prior RankingPlace per player (before periodDate) ---
    const priorPlaces = await RankingPlace.createQueryBuilder('rp')
      .select(['rp.playerId', 'rp.single', 'rp.double', 'rp.mix', 'rp.rankingDate'])
      .where('rp.systemId = :systemId', { systemId })
      .andWhere('rp.playerId IN (:...playerIds)', { playerIds })
      .andWhere('rp.rankingDate < :periodDate', { periodDate })
      .orderBy('rp.rankingDate', 'DESC')
      .getMany();

    const priorByPlayer = new Map<string, RankingPlace>();
    for (const place of priorPlaces) {
      if (!priorByPlayer.has(place.playerId)) {
        priorByPlayer.set(place.playerId, place);
      }
    }

    // --- 4. Player genders ---
    const players = await Player.find({
      where: { id: In(playerIds) },
      select: ['id', 'gender'],
    });
    const genderByPlayer = new Map(players.map((p) => [p.id, p.gender]));

    await updateProgress(65);

    // --- 5. Build RankingPlace objects ---
    const places: Partial<RankingPlace>[] = [];

    for (const playerId of playerIds) {
      const agg = aggregated.get(playerId)!;
      const flags = inactivity.get(playerId)!;
      const prior = priorByPlayer.get(playerId);

      let single = prior?.single ?? system.amountOfLevels;
      let double = prior?.double ?? system.amountOfLevels;
      let mix = prior?.mix ?? system.amountOfLevels;

      if (isUpdateDate && system.pointsToGoUp && system.pointsToGoDown) {
        single = this.calcNewLevel(agg.single, single ?? system.amountOfLevels ?? 12, flags.single, system);
        double = this.calcNewLevel(agg.double, double ?? system.amountOfLevels ?? 12, flags.double, system);
        mix = this.calcNewLevel(agg.mix, mix ?? system.amountOfLevels ?? 12, flags.mix, system);

        const protected_ = getRankingProtected({ single, double, mix }, system);
        single = protected_.single;
        double = protected_.double;
        mix = protected_.mix;
      }

      places.push({
        playerId,
        systemId,
        rankingDate: new Date(periodDate),
        updatePossible: isUpdateDate,
        gender: genderByPlayer.get(playerId),
        single,
        double,
        mix,
        singlePoints: agg.single,
        doublePoints: agg.double,
        mixPoints: agg.mix,
        singleInactive: flags.single,
        doubleInactive: flags.double,
        mixInactive: flags.mix,
      });
    }

    await updateProgress(75);

    // --- 6. Upsert in chunks of 500 ---
    const rankingDate = new Date(periodDate);
    const chunkSize = 500;
    for (let i = 0; i < places.length; i += chunkSize) {
      const chunk = places.slice(i, i + chunkSize);

      const existing = await RankingPlace.find({
        where: {
          playerId: In(chunk.map((p) => p.playerId!)),
          systemId,
          rankingDate,
        },
        select: ['id', 'playerId'],
      });
      const existingById = new Map(existing.map((e) => [e.playerId, e.id]));

      const toSave = chunk.map((p) =>
        RankingPlace.create({ ...p, ...(existingById.has(p.playerId!) ? { id: existingById.get(p.playerId!) } : {}) }),
      );

      await RankingPlace.save(toSave);
    }

    await updateProgress(90);

    // --- 7. Coordinate: DECR and enqueue FINALIZE if last batch ---
    const client = await this.rankingCalcQueue.client;
    const remaining = await client.decr(batchKey);

    if (remaining <= 0) {
      this.logger.log(`Last batch done for ${periodDate}, enqueuing finalize`);
      await this.rankingCalcQueue.add(
        JOB_TYPES.RANKING_CALC_FINALIZE,
        {
          systemId,
          calcDate: periodDate,
          isUpdateDate,
          metadata: { displayName: `Finalize ranking: ${periodDate}` },
        } as RankingCalcFinalizeJobData,
        { priority: 25 },
      );
    }

    await updateProgress(100);
    this.logger.log(`Processed batch of ${playerIds.length} players for ${periodDate}`);
  }

  // ---------------------------------------------------------------------------
  // FINALIZE — assigns global ranks, updates system timestamps
  // ---------------------------------------------------------------------------

  async processFinalize(
    job: Job<RankingCalcFinalizeJobData>,
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    await updateProgress(0);
    const { systemId, calcDate, isUpdateDate } = job.data;

    const [system, places] = await Promise.all([
      RankingSystem.findOneOrFail({ where: { id: systemId } }),
      RankingPlace.find({
        where: { systemId, rankingDate: new Date(calcDate) },
        select: ['id', 'playerId', 'single', 'double', 'mix', 'singlePoints', 'doublePoints', 'mixPoints'],
      }),
    ]);

    this.logger.log(`Finalizing ranks for ${places.length} players on ${calcDate}`);
    await updateProgress(20);

    this.assignRanks(places, 'single', 'singlePoints');
    await updateProgress(40);
    this.assignRanks(places, 'double', 'doublePoints');
    await updateProgress(60);
    this.assignRanks(places, 'mix', 'mixPoints');
    await updateProgress(70);

    const chunkSize = 500;
    for (let i = 0; i < places.length; i += chunkSize) {
      await RankingPlace.save(places.slice(i, i + chunkSize));
    }

    await updateProgress(90);

    system.calculationLastUpdate = new Date(calcDate);
    if (isUpdateDate) {
      system.updateLastUpdate = new Date(calcDate);
    }
    await system.save();

    await updateProgress(100);
    this.logger.log(`Finalized ranking for ${system.name} on ${calcDate}`);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private calcNewLevel(
    points: number,
    currentLevel: number,
    isInactive: boolean,
    system: RankingSystem,
  ): number {
    const maxLevel = system.amountOfLevels ?? 12;
    const maxUp = system.maxLevelUpPerChange ?? 1;
    const maxDown = system.maxLevelDownPerChange ?? 1;

    if (isInactive) {
      if (system.inactiveBehavior === 'freeze') return currentLevel;
      return Math.min(currentLevel + 1, maxLevel); // decrease = move down
    }

    // pointsToGoUp[i] = threshold to reach level i+1 (0-indexed, level 1 is best)
    const upIdx = currentLevel - 2; // threshold to go from currentLevel to currentLevel-1
    const upThreshold = upIdx >= 0 ? (system.pointsToGoUp?.[upIdx] ?? Infinity) : Infinity;
    const downThreshold = system.pointsToGoDown?.[currentLevel - 1] ?? 0;

    if (points >= upThreshold) return Math.max(1, currentLevel - maxUp);
    if (points < downThreshold) return Math.min(maxLevel, currentLevel + maxDown);
    return currentLevel;
  }

  private assignRanks(
    places: RankingPlace[],
    discipline: 'single' | 'double' | 'mix',
    pointsField: 'singlePoints' | 'doublePoints' | 'mixPoints',
  ): void {
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const rankField = `${discipline}Rank` as 'singleRank' | 'doubleRank' | 'mixRank';
    const totalField = `total${cap(discipline)}Ranking` as 'totalSingleRanking' | 'totalDoubleRanking' | 'totalMixRanking';
    const withinField = `totalWithin${cap(discipline)}Level` as 'totalWithinSingleLevel' | 'totalWithinDoubleLevel' | 'totalWithinMixLevel';

    const sorted = [...places].sort((a, b) => (b[pointsField] ?? 0) - (a[pointsField] ?? 0));
    sorted.forEach((p, i) => {
      p[rankField] = i + 1;
      p[totalField] = i + 1;
    });

    const byLevel = new Map<number, RankingPlace[]>();
    for (const p of places) {
      const lvl = p[discipline] ?? 0;
      if (!byLevel.has(lvl)) byLevel.set(lvl, []);
      byLevel.get(lvl)!.push(p);
    }
    for (const [, group] of byLevel) {
      group.sort((a, b) => (b[pointsField] ?? 0) - (a[pointsField] ?? 0));
      group.forEach((p, i) => {
        p[withinField] = i + 1;
      });
    }
  }
}
