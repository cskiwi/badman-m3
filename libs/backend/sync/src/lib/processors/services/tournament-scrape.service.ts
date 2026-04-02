import { TournamentEvent } from '@app/models';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { Between, In, Not } from 'typeorm';
import {
  JOB_TYPES,
  TOURNAMENT_DISCOVERY_QUEUE,
  TournamentScrapeEventJobData,
  TournamentScrapeYearCleanupJobData,
  TournamentScrapeYearJobData,
} from '../../queues/sync.queue';
import { SyncService } from '../../services/sync.service';

const BASE_URL = 'https://www.badmintonvlaanderen.be';
const CALENDAR_PATH = '/calendar/180/Tornooi-Kalender';

@Injectable()
export class TournamentScrapeService {
  private readonly logger = new Logger(TournamentScrapeService.name);

  constructor(
    @InjectQueue(TOURNAMENT_DISCOVERY_QUEUE)
    private readonly discoveryQueue: Queue,
    private readonly syncService: SyncService,
  ) {}

  async processScrapeYear(
    job: Job<TournamentScrapeYearJobData>,
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    const { year, runAdding = true, runCleanup = true } = job.data;

    await updateProgress(0);
    this.logger.log(`Scraping calendar for year ${year} (runAdding=${runAdding}, runCleanup=${runCleanup})`);

    const calendarUrl = `${BASE_URL}${CALENDAR_PATH}?year=${year}`;
    const html = await this.fetchPage(calendarUrl);

    if (!html) {
      throw new Error(`Failed to fetch calendar page for year ${year}`);
    }

    const eventLinks = this.extractCalendarEventLinks(html);
    this.logger.log(`Found ${eventLinks.length} calendar events for ${year}`);

    await updateProgress(10);

    if (runAdding) {
      for (let i = 0; i < eventLinks.length; i++) {
        const eventUrl = eventLinks[i];
        const eventName = this.extractEventName(eventUrl);

        await this.discoveryQueue.add(
          JOB_TYPES.TOURNAMENT_SCRAPE_EVENT,
          {
            year,
            eventUrl,
            eventName,
            metadata: { displayName: `Scrape event: ${eventName}`, eventName },
          } satisfies TournamentScrapeEventJobData,
        );

        await updateProgress(10 + Math.round(((i + 1) / eventLinks.length) * 90));
      }

      this.logger.log(`Queued ${eventLinks.length} event scrape jobs for year ${year}`);
    } else {
      this.logger.log(`Skipping event adding for year ${year} (runAdding=false)`);
    }

    if (runCleanup) {
      await this.discoveryQueue.add(
        JOB_TYPES.TOURNAMENT_SCRAPE_YEAR_CLEANUP,
        {
          year,
          metadata: { displayName: `Cleanup missing tournaments for ${year}` },
        } satisfies TournamentScrapeYearCleanupJobData,
      );
    } else {
      this.logger.log(`Skipping cleanup for year ${year} (runCleanup=false)`);
    }

    await updateProgress(100);
  }

  async processScrapeEvent(
    job: Job<TournamentScrapeEventJobData>,
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    const { eventUrl, eventName, year } = job.data;

    await updateProgress(0);
    this.logger.log(`Scraping event: ${eventName} (${eventUrl})`);

    // Respectful delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const html = await this.fetchPage(eventUrl);
    if (!html) {
      this.logger.warn(`Could not fetch event page: ${eventUrl}`);
      await updateProgress(100);
      return;
    }

    await updateProgress(50);

    const tournamentIds = this.extractTournamentIds(html);
    if (tournamentIds.length === 0) {
      this.logger.debug(`No tournament IDs found for event: ${eventName}`);
      await updateProgress(100);
      return;
    }

    const status = this.extractFieldValue(html, 'Status');
    const category = this.extractFieldValue(html, 'Categorie');
    const group = this.extractFieldValue(html, 'Groep');
    const { official, levelMin, levelMax } = this.parseOfficialCategory(category);

    this.logger.log(
      `Event "${eventName}" (${year}): ${tournamentIds.length} tournament(s), official=${official}${official ? ` (levels ${levelMin}-${levelMax})` : ''}`,
    );

    for (const tournamentId of tournamentIds) {
      const tournament = await TournamentEvent.findOne({ where: { visualCode: tournamentId } });

      if (!tournament) {
        this.logger.debug(`Tournament not found in DB: ${tournamentId} (${eventName})`);
        continue;
      }

      if (tournament.official === official) {
        this.logger.debug(`Tournament "${tournament.name}" official status already correct (${official})`);
        continue;
      }

      const previousOfficial = tournament.official;
      tournament.official = official;
      await tournament.save();

      this.logger.log(`Updated "${tournament.name}" official: ${previousOfficial} → ${official}`);

      const action = official ? 'create' : 'remove';
      await this.syncService.queueTournamentRankingRecalc({
        tournamentId: tournament.id,
        action,
        metadata: {
          displayName: `Ranking point ${action} for ${tournament.name}`,
          eventName: tournament.name,
        },
      });
    }

    await updateProgress(100);
  }

  async processScrapeYearCleanup(
    job: Job<TournamentScrapeYearCleanupJobData>,
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    const { year } = job.data;

    await updateProgress(0);
    this.logger.log(`Running cleanup for year ${year}: finding tournaments not on calendar`);

    // Re-fetch the calendar to collect all visual codes present for this year
    const calendarUrl = `${BASE_URL}${CALENDAR_PATH}?year=${year}`;
    const html = await this.fetchPage(calendarUrl);

    if (!html) {
      throw new Error(`Failed to fetch calendar page for year ${year}`);
    }

    const eventLinks = this.extractCalendarEventLinks(html);
    this.logger.log(`Cleanup: found ${eventLinks.length} calendar events for ${year}`);

    await updateProgress(10);

    // Collect all tournament visual codes referenced on the calendar
    const calendarVisualCodes = new Set<string>();
    for (let i = 0; i < eventLinks.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const eventHtml = await this.fetchPage(eventLinks[i]);
      if (eventHtml) {
        for (const id of this.extractTournamentIds(eventHtml)) {
          calendarVisualCodes.add(id);
        }
      }
      await updateProgress(10 + Math.round(((i + 1) / eventLinks.length) * 80));
    }

    this.logger.log(`Cleanup: calendar references ${calendarVisualCodes.size} unique tournament(s) for ${year}`);

    // Find official TournamentEvents in this year whose visualCode is NOT on the calendar
    const startOfYear = new Date(year, 0, 1);
    const startOfNextYear = new Date(year + 1, 0, 1);
    const dbTournaments = await TournamentEvent.find({
      where: {
        firstDay: Between(startOfYear, startOfNextYear),
        official: true,
        visualCode: Not(In([...calendarVisualCodes])),
      },
      select: ['id', 'visualCode', 'name', 'official'],
    });

    this.logger.log(`Cleanup: found ${dbTournaments.length} official tournament(s) in DB for ${year} not on calendar`);

    let markedCount = 0;
    for (const tournament of dbTournaments) {

      this.logger.log(`Cleanup: marking "${tournament.name}" (${tournament.visualCode ?? 'no code'}) for removal — not on ${year} calendar`);
      tournament.official = false;
      await tournament.save();
      markedCount++;

      await this.syncService.queueTournamentRankingRecalc({
        tournamentId: tournament.id,
        action: 'remove',
        metadata: {
          displayName: `Ranking point remove for ${tournament.name} (not on ${year} calendar)`,
          eventName: tournament.name,
        },
      });
    }

    this.logger.log(`Cleanup: marked ${markedCount} tournament(s) for removal for year ${year}`);
    await updateProgress(100);
  }

  private async fetchPage(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        this.logger.error(`Failed to fetch ${url}: ${response.status}`);
        return null;
      }

      return await response.text();
    } catch (error) {
      this.logger.error(`Error fetching ${url}: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  private extractCalendarEventLinks(html: string): string[] {
    const pattern = /href=["'](?:\.\.\/\.\.)?\/calendarevent\/(\d+)\/([^"']+)["']/gi;
    const links: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(html)) !== null) {
      links.push(`${BASE_URL}/calendarevent/${match[1]}/${match[2]}`);
    }

    return [...new Set(links)];
  }

  private extractTournamentIds(html: string): string[] {
    const pattern = /sport\/tournament\?id=([A-F0-9-]+)/gi;
    const ids: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(html)) !== null) {
      ids.push(match[1].toUpperCase());
    }

    return [...new Set(ids)];
  }

  private extractFieldValue(html: string, fieldName: string): string | null {
    const pattern = new RegExp(
      `<strong>${fieldName}:?[^<]*<\\/strong><\\/td><td[^>]*>\\s*([^<]+?)\\s*(?:<|$)`,
      'i',
    );
    const match = pattern.exec(html);
    return match ? match[1].trim() : null;
  }

  private parseOfficialCategory(category: string | null): {
    official: boolean;
    levelMin: number | null;
    levelMax: number | null;
  } {
    if (!category) return { official: false, levelMin: null, levelMax: null };

    // Youth (-11, -13) and veteran (+35, +40) categories — not official
    if (/(?:^|\s)[+-]\d/.test(category)) return { official: false, levelMin: null, levelMax: null };

    const numbers = [...category.matchAll(/\d+/g)].map((m) => Number(m[0]));
    if (numbers.length === 0) return { official: false, levelMin: null, levelMax: null };
    if (numbers.some((n) => n < 1 || n > 12)) return { official: false, levelMin: null, levelMax: null };

    return { official: true, levelMin: Math.min(...numbers), levelMax: Math.max(...numbers) };
  }

  private extractEventName(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'Unknown';
  }
}
