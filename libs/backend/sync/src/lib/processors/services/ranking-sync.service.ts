import { TournamentApiClient } from '@app/backend-tournament-api';
import { getRankingProtected } from '@app/backend-ranking';
import { Player, RankingPlace, RankingSystem } from '@app/models';
import { RankingSystems } from '@app/models-enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { In } from 'typeorm';
import dayjs = require('dayjs');
import {
  JOB_TYPES,
  RANKING_SYNC_QUEUE,
  RankingSyncInitJobData,
  RankingSyncPublicationJobData,
  RankingSyncCategoryData,
} from '../../queues/sync.queue';

// Maps category names from the API to our internal discipline types
const CATEGORY_DISCIPLINE_MAP: Record<string, { type: 'single' | 'double' | 'mix'; gender: 'M' | 'F' }> = {
  'HE/SM':    { type: 'single', gender: 'M' },
  'DE/SD':    { type: 'single', gender: 'F' },
  'HD/DM':    { type: 'double', gender: 'M' },
  'DD':       { type: 'double', gender: 'F' },
  'GD H/DX M': { type: 'mix', gender: 'M' },
  'GD D/DX D': { type: 'mix', gender: 'F' },
};

// Bimonthly update months (0-indexed: Jan, Mar, May, Jul, Sep, Nov)
const UPDATE_MONTHS = [0, 2, 4, 6, 8, 10];

// Known bad/good dates inherited from old sync logic
const FORCED_UPDATE_DATES = ['2021-09-12T22:00:00.000Z'];
const FORCED_NON_UPDATE_DATES = ['2021-09-05T22:00:00.000Z'];

@Injectable()
export class RankingSyncService {
  private readonly logger = new Logger(RankingSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    @InjectQueue(RANKING_SYNC_QUEUE) private readonly rankingSyncQueue: Queue,
  ) {}

  async processInit(
    job: Job<RankingSyncInitJobData>,
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    await updateProgress(0);

    // 1. Find the BBF Rating system in our database
    const system = await RankingSystem.findOne({
      where: { rankingSystem: RankingSystems.VISUAL },
    });

    if (!system) {
      this.logger.warn('No VISUAL ranking system found in database, skipping ranking sync');
      await updateProgress(100);
      return;
    }

    this.logger.log(`Found ranking system: ${system.name} (${system.id})`);
    await updateProgress(10);

    // 2. Fetch available ranking systems from the API and find BBF Rating
    const rankings = await this.tournamentApiClient.getRankings();
    const bbfRating = rankings.find((r) => r.Name === system.name) ?? rankings[0];

    if (!bbfRating) {
      this.logger.warn('No rankings returned from API');
      await updateProgress(100);
      return;
    }

    this.logger.log(`Using ranking: ${bbfRating.Name} (code: ${bbfRating.Code})`);
    await updateProgress(20);

    // 3. Fetch categories
    const apiCategories = await this.tournamentApiClient.getRankingCategories(bbfRating.Code);
    const categories: RankingSyncCategoryData[] = apiCategories
      .filter((c) => c.Name in CATEGORY_DISCIPLINE_MAP)
      .map((c) => ({ code: c.Code, name: c.Name }));

    this.logger.log(`Found ${categories.length} relevant categories`);
    await updateProgress(30);

    // 4. Fetch all publications and filter to those newer than our last sync
    const allPublications = await this.tournamentApiClient.getRankingPublications(bbfRating.Code);
    const checkpointDate = job.data.startDate
      ? dayjs(job.data.startDate)
      : system.updateLastUpdate
        ? dayjs(system.updateLastUpdate)
        : dayjs().subtract(1, 'week');

    const visiblePublications = allPublications
      .filter((p) => p.Visible)
      .map((p) => {
        const date = dayjs(p.PublicationDate, 'YYYY-MM-DD');
        return { ...p, date };
      })
      .filter((p) => p.date.isAfter(checkpointDate))
      .sort((a, b) => a.date.valueOf() - b.date.valueOf());

    if (visiblePublications.length === 0) {
      this.logger.log('No new publications to sync since last update');
      await updateProgress(100);
      return;
    }

    this.logger.log(`Enqueueing ${visiblePublications.length} publications for sync`);
    await updateProgress(50);

    // 5. Enqueue one job per publication
    for (let i = 0; i < visiblePublications.length; i++) {
      const pub = visiblePublications[i];
      const isLastPublication = i === visiblePublications.length - 1;
      const usedForUpdate = this.isUpdatePublication(pub.date.toDate());

      const data: RankingSyncPublicationJobData = {
        rankingCode: bbfRating.Code,
        systemId: system.id,
        publicationCode: pub.Code,
        publicationDate: pub.date.toISOString(),
        usedForUpdate,
        categories,
        isLastPublication,
        metadata: {
          displayName: `Ranking sync: ${pub.Name} (${pub.date.format('YYYY-MM-DD')})`,
        },
      };

      await this.rankingSyncQueue.add(JOB_TYPES.RANKING_SYNC_PUBLICATION, data, {
        priority: 20,
      });
    }

    await updateProgress(100);
    this.logger.log(`Enqueued ${visiblePublications.length} publication sync jobs`);
  }

  async processPublication(
    job: Job<RankingSyncPublicationJobData>,
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    const { rankingCode, systemId, publicationCode, publicationDate, usedForUpdate, categories, isLastPublication } = job.data;

    this.logger.log(`Syncing publication ${publicationCode} (${dayjs(publicationDate).format('YYYY-MM-DD')})`);
    await updateProgress(0);

    const system = await RankingSystem.findOneOrFail({ where: { id: systemId } });
    await updateProgress(5);

    // For each category, fetch the player entries from the per-publication+category endpoint:
    // GET /1.0/Ranking/{rankingCode}/Publication/{publicationCode}/Category/{categoryCode}
    const categoryResults = await Promise.all(
      categories.map(async (cat) => {
        const entries = await this.tournamentApiClient.getRankingPlacesByCategory(rankingCode, publicationCode, cat.code);
        this.logger.debug(`Category ${cat.name} (${cat.code}): ${entries.length} entries`);
        return { category: cat, entries };
      }),
    );

    await updateProgress(40);

    // Collect all memberIds to batch-load players
    const allMemberIds = new Set<string>();
    for (const { entries } of categoryResults) {
      for (const entry of entries) {
        if (entry.Player1?.MemberID) {
          allMemberIds.add(String(entry.Player1.MemberID));
        }
      }
    }

    this.logger.debug(`Found ${allMemberIds.size} unique member IDs for publication ${publicationCode}`);

    // Load existing players with their last ranking place
    const existingPlayers = await Player.find({
      where: { memberId: In([...allMemberIds]) },
      relations: ['rankingLastPlaces'],
    });

    const playerByMemberId = new Map<string, Player>(existingPlayers.map((p) => [p.memberId, p]));
    await updateProgress(55);

    // Build ranking places map keyed by memberId (playerId resolved after player save)
    const rankingPlaces = new Map<string, RankingPlace>();
    const newPlayers: Player[] = [];

    for (const { category, entries } of categoryResults) {
      const discipline = CATEGORY_DISCIPLINE_MAP[category.name];
      if (!discipline) {
        this.logger.warn(`Unknown category name: ${category.name}`);
        continue;
      }

      for (const entry of entries) {
        const memberId = String(entry.Player1?.MemberID ?? '');
        if (!memberId) continue;

        let player = playerByMemberId.get(memberId);

        if (!player) {
          const [firstName, ...lastNameParts] = (entry.Player1.Name ?? '').split(' ').filter(Boolean);
          player = Player.create({
            memberId,
            firstName: firstName ?? '',
            lastName: lastNameParts.join(' '),
            gender: discipline.gender,
          });
          newPlayers.push(player);
          playerByMemberId.set(memberId, player);
        }

        const existing = rankingPlaces.get(memberId);

        if (existing) {
          existing[discipline.type] = entry.Level;
          existing[`${discipline.type}Points` as 'singlePoints' | 'doublePoints' | 'mixPoints'] = entry.Totalpoints;
          existing[`${discipline.type}Rank` as 'singleRank' | 'doubleRank' | 'mixRank'] = entry.Rank;
        } else {
          const place = new RankingPlace();
          place.playerId = ''; // resolved after player save below
          place.systemId = systemId;
          place.rankingDate = new Date(publicationDate);
          place.updatePossible = usedForUpdate;
          place.gender = discipline.gender;
          place.singleInactive = false;
          place.doubleInactive = false;
          place.mixInactive = false;
          place[discipline.type] = entry.Level;
          place[`${discipline.type}Points` as 'singlePoints' | 'doublePoints' | 'mixPoints'] = entry.Totalpoints;
          place[`${discipline.type}Rank` as 'singleRank' | 'doubleRank' | 'mixRank'] = entry.Rank;
          rankingPlaces.set(memberId, place);
        }
      }
    }

    await updateProgress(70);

    // Save new players first so they get an id
    if (newPlayers.length > 0) {
      this.logger.log(`Creating ${newPlayers.length} new players`);
      const saved = await Player.save(newPlayers);
      for (const p of saved) {
        playerByMemberId.set(p.memberId, p);
      }
    }

    // Resolve playerIds and apply getRankingProtected to fill missing disciplines
    const places: RankingPlace[] = [];
    for (const [memberId, place] of rankingPlaces) {
      const player = playerByMemberId.get(memberId);
      if (!player?.id) {
        this.logger.warn(`Could not resolve player id for memberId ${memberId}, skipping`);
        continue;
      }

      place.playerId = player.id;

      // Fill missing disciplines from last known place or system defaults
      const lastPlace = player.rankingLastPlaces?.find((lp) => lp.systemId === systemId);
      const protected_ = getRankingProtected(
        {
          single: place.single ?? lastPlace?.single ?? undefined,
          double: place.double ?? lastPlace?.double ?? undefined,
          mix: place.mix ?? lastPlace?.mix ?? undefined,
        },
        system,
      );
      place.single = place.single ?? protected_.single;
      place.double = place.double ?? protected_.double;
      place.mix = place.mix ?? protected_.mix;

      places.push(place);
    }

    await updateProgress(80);

    // Upsert ranking places in chunks
    this.logger.log(`Upserting ${places.length} ranking places for publication ${publicationCode}`);
    const chunkSize = 500;
    for (let i = 0; i < places.length; i += chunkSize) {
      const chunk = places.slice(i, i + chunkSize);

      // Find existing records to get their IDs (all places share the same systemId + rankingDate)
      const existing = await RankingPlace.find({
        where: {
          playerId: In(chunk.map((p) => p.playerId)),
          systemId: chunk[0].systemId,
          rankingDate: chunk[0].rankingDate,
        },
        select: ['id', 'playerId'],
      });

      const existingById = new Map(existing.map((e) => [e.playerId, e.id]));
      for (const place of chunk) {
        const id = existingById.get(place.playerId);
        if (id) place.id = id;
      }

      const saved = await RankingPlace.save(chunk);
      this.logger.debug(`Chunk ${Math.floor(i / chunkSize) + 1}: saved ${saved.length} records`);
    }

    this.logger.log(`Upserted ${places.length} ranking places for publication ${publicationCode}`);
    await updateProgress(90);

    // If this is the last publication, update the system timestamps
    if (isLastPublication) {
      system.calculationLastUpdate = new Date(publicationDate);
      if (usedForUpdate) {
        system.updateLastUpdate = new Date(publicationDate);
      }
      await system.save();
      this.logger.log(`Updated ranking system timestamps`);
    }

    // Remove ranking places for publications that are now hidden
    // (handled by the init job via visible filter — no action needed here)

    await updateProgress(100);
    this.logger.log(`Completed publication sync for ${publicationCode}`);
  }

  private isUpdatePublication(date: Date): boolean {
    const iso = date.toISOString();

    if (FORCED_UPDATE_DATES.includes(iso)) return true;
    if (FORCED_NON_UPDATE_DATES.includes(iso)) return false;

    const d = dayjs(date);
    if (!UPDATE_MONTHS.includes(d.month())) return false;

    // First Monday of the month
    let firstMonday = d.startOf('month');
    while (firstMonday.day() !== 1) {
      firstMonday = firstMonday.add(1, 'day');
    }

    // Allow up to 2-day margin after the first Monday
    const margin = firstMonday.add(2, 'day');
    return (d.isSame(firstMonday) || (d.isAfter(firstMonday) && d.isBefore(margin))) ;
  }

}
