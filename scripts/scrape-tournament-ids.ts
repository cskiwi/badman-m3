/**
 * Script to scrape tournament IDs from badmintonvlaanderen.be
 *
 * Usage: npx tsx scripts/scrape-tournament-ids.ts
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://www.badmintonvlaanderen.be';
const CALENDAR_PATH = '/calendar/180/Tornooi-Kalender';

interface TournamentInfo {
  year: number;
  eventUrl: string;
  eventName: string;
  tournamentId: string | null;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

function extractCalendarEventLinks(html: string): string[] {
  // Match links like ../../calendarevent/77126/BC-Beaumontois-Jeunes-Veterans-2025
  // or href="/calendarevent/..."
  const relativePattern = /href=["'](?:\.\.\/\.\.)?\/calendarevent\/(\d+)\/([^"']+)["']/gi;
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = relativePattern.exec(html)) !== null) {
    const eventId = match[1];
    const eventSlug = match[2];
    links.push(`${BASE_URL}/calendarevent/${eventId}/${eventSlug}`);
  }

  // Remove duplicates
  return [...new Set(links)];
}

function extractTournamentIds(html: string): string[] {
  // Match links like https://www.badmintonvlaanderen.be/sport/tournament?id=A28F7CF7-36D9-4C52-9A53-8BD8E1700C3A
  const pattern = /sport\/tournament\?id=([A-F0-9-]+)/gi;
  const ids: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    ids.push(match[1].toUpperCase());
  }

  // Remove duplicates
  return [...new Set(ids)];
}

function extractEventName(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 1] || 'Unknown';
}

async function scrapeYear(year: number): Promise<TournamentInfo[]> {
  console.log(`\n📅 Scraping year ${year}...`);

  const calendarUrl = `${BASE_URL}${CALENDAR_PATH}?year=${year}`;
  const calendarHtml = await fetchPage(calendarUrl);

  if (!calendarHtml) {
    console.error(`  ❌ Could not fetch calendar for ${year}`);
    return [];
  }

  const eventLinks = extractCalendarEventLinks(calendarHtml);
  console.log(`  📌 Found ${eventLinks.length} calendar events`);

  const results: TournamentInfo[] = [];

  for (let i = 0; i < eventLinks.length; i++) {
    const eventUrl = eventLinks[i];
    const eventName = extractEventName(eventUrl);

    // Add delay to be respectful to the server
    await delay(300);

    process.stdout.write(`  🔍 [${i + 1}/${eventLinks.length}] ${eventName.substring(0, 50)}...`);

    const eventHtml = await fetchPage(eventUrl);

    if (!eventHtml) {
      console.log(' ❌');
      results.push({
        year,
        eventUrl,
        eventName,
        tournamentId: null,
      });
      continue;
    }

    const tournamentIds = extractTournamentIds(eventHtml);

    if (tournamentIds.length > 0) {
      console.log(` ✅ ${tournamentIds.length} tournament(s)`);
      for (const id of tournamentIds) {
        results.push({
          year,
          eventUrl,
          eventName,
          tournamentId: id,
        });
      }
    } else {
      console.log(' (no tournament link)');
      results.push({
        year,
        eventUrl,
        eventName,
        tournamentId: null,
      });
    }
  }

  return results;
}

async function main() {
  console.log('🏸 Badminton Vlaanderen Tournament ID Scraper');
  console.log('=============================================\n');

  const startYear = 2026;
  const endYear = 2020;
  const allResults: TournamentInfo[] = [];

  for (let year = startYear; year >= endYear; year--) {
    const yearResults = await scrapeYear(year);
    allResults.push(...yearResults);
  }

  // Filter only entries with tournament IDs
  const withIds = allResults.filter((r) => r.tournamentId !== null);

  console.log('\n\n📊 SUMMARY');
  console.log('==========');
  console.log(`Total calendar events checked: ${allResults.length}`);
  console.log(`Events with tournament IDs: ${withIds.length}`);

  // Group by year
  const byYear = new Map<number, TournamentInfo[]>();
  for (const result of withIds) {
    const yearResults = byYear.get(result.year) || [];
    yearResults.push(result);
    byYear.set(result.year, yearResults);
  }

  console.log('\nBy year:');
  for (let year = startYear; year >= endYear; year--) {
    const count = byYear.get(year)?.length || 0;
    if (count > 0) {
      console.log(`  ${year}: ${count} tournaments`);
    }
  }

  // Output all tournament IDs
  console.log('\n\n🎯 ALL TOURNAMENT IDs');
  console.log('=====================');

  const uniqueIds = [...new Set(withIds.map((r) => r.tournamentId))];
  console.log(`\nUnique tournament IDs found: ${uniqueIds.length}\n`);

  // Output as JSON for easy processing
  const output = {
    scrapedAt: new Date().toISOString(),
    yearsScraped: { from: startYear, to: endYear },
    totalEvents: allResults.length,
    eventsWithTournamentIds: withIds.length,
    uniqueTournamentIds: uniqueIds.length,
    tournaments: withIds.map((r) => ({
      year: r.year,
      eventName: r.eventName,
      tournamentId: r.tournamentId,
      eventUrl: r.eventUrl,
    })),
  };

  // Write results to file
  const outputPath = join(process.cwd(), 'scripts', 'tournament-ids-output.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Results saved to ${outputPath}`);

  // Also output just the IDs for quick reference
  console.log('\nTournament IDs (one per line):');
  console.log('-----------------------------');
  for (const id of uniqueIds) {
    console.log(id);
  }
}

main().catch(console.error);
