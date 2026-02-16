import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { parseStringPromise } from 'xml2js';
import {
  Entry,
  Match,
  MatchResponse,
  MatchesResponse,
  Stage,
  StagesResponse,
  Team,
  TeamMatch,
  TeamMatchesResponse,
  Tournament,
  TournamentDetailsResponse,
  TournamentDraw,
  TournamentDrawResponse,
  TournamentEntriesResponse,
  TournamentEvent,
  TournamentEventsResponse,
  TournamentListResponse,
  TournamentTeamsResponse,
} from '../types/tournament.types';

@Injectable()
export class TournamentApiClient {
  private readonly logger = new Logger(TournamentApiClient.name);
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly redis?: Redis;
  private readonly cacheEnabled: boolean;

  // In-memory cache of tournament end dates for smart TTL decisions
  private readonly tournamentEndDates = new Map<string, string>();

  // 1 year in seconds - used for old tournaments that won't change
  private static readonly PERMANENT_TTL = 31536000;

  // Cache TTL in seconds for different data types
  private readonly cacheTtl = {
    tournaments: 3600, // 1 hour - tournament list changes infrequently
    tournamentDetails: 1800, // 30 minutes - details may update during tournament
    events: 1800, // 30 minutes - events are fairly static
    teams: 900, // 15 minutes - team compositions may change
    entries: 600, // 10 minutes - entries may be updated
    draws: 300, // 5 minutes - draws may be updated during tournament
    matches: 60, // 1 minute - match data changes frequently during play
    stages: 1800, // 30 minutes - stages are static during tournament
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('TOURNAMENT_API_BASE_URL', 'https://api.tournamentsoftware.com');
    this.username = this.configService.getOrThrow<string>('TOURNAMENT_API_USERNAME');
    this.password = this.configService.getOrThrow<string>('TOURNAMENT_API_PASSWORD');
    this.cacheEnabled = this.configService.get<boolean>('TOURNAMENT_API_CACHE_ENABLED', true);

    // Initialize Redis connection if caching is enabled
    if (this.cacheEnabled) {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
      const redisDB = this.configService.get<number>('REDIS_DB');

      if (redisUrl) {
        this.redis = new Redis(redisUrl);
      } else {
        this.redis = new Redis({
          host: redisHost,
          port: redisPort,
          db: redisDB,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
      }
    }
  }

  private getAuthHeaders() {
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/xml',
      Accept: 'application/xml',
    };
  }

  private generateCacheKey(endpoint: string): string {
    return `tournament-api:${endpoint}`;
  }

  private getCacheType(endpoint: string): keyof typeof this.cacheTtl {
    if (endpoint.includes('/Tournament?')) return 'tournaments';
    if (endpoint.includes('/Tournament/') && endpoint.includes('/Event')) return 'events';
    if (endpoint.includes('/Tournament/') && endpoint.includes('/Team')) return 'teams';
    if (endpoint.includes('/Tournament/') && endpoint.includes('/Entry')) return 'entries';
    if (endpoint.includes('/Tournament/') && endpoint.includes('/Draw')) return 'draws';
    if (endpoint.includes('/Match') || endpoint.includes('/Encounter')) return 'matches';
    if (endpoint.includes('/Stages')) return 'stages';
    if (endpoint.includes('/Tournament/') && !endpoint.includes('/')) return 'tournamentDetails';
    return 'tournamentDetails'; // Default fallback
  }

  /**
   * Extract tournament code from an endpoint URL
   */
  private extractTournamentCode(endpoint: string): string | null {
    const match = endpoint.match(/\/Tournament\/([^/?]+)/);
    return match ? match[1] : null;
  }

  /**
   * Determine TTL based on whether the tournament has ended > 1 year ago.
   * Old tournaments won't change, so cache them effectively permanently.
   */
  private determineTtl(endpoint: string, tournamentDetails?: TournamentDetailsResponse): number {
    const cacheType = this.getCacheType(endpoint);
    const baseTtl = this.cacheTtl[cacheType];
    const tournamentCode = this.extractTournamentCode(endpoint);
    if (!tournamentCode) return baseTtl;

    // For tournament detail responses, extract and store EndDate
    if (tournamentDetails) {
      const endDate = tournamentDetails.Result?.Tournament?.EndDate;
      if (endDate) {
        this.tournamentEndDates.set(tournamentCode, endDate);
      }
    }

    // Check if this tournament ended > 1 year ago
    const endDateStr = this.tournamentEndDates.get(tournamentCode);
    if (endDateStr) {
      const endDate = new Date(endDateStr);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (endDate < oneYearAgo) {
        return TournamentApiClient.PERMANENT_TTL;
      }
    }

    return baseTtl;
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const cacheKey = this.generateCacheKey(endpoint);

    // Try to get from cache first if caching is enabled
    if (this.cacheEnabled && this.redis) {
      try {
        const cachedResult = await this.redis.get(cacheKey);
        if (cachedResult) {
          this.logger.debug(`Cache hit for endpoint: ${endpoint}`);
          return JSON.parse(cachedResult) as T;
        }
        this.logger.debug(`Cache miss for endpoint: ${endpoint}`);
      } catch (cacheError) {
        this.logger.warn(`Cache read failed for ${endpoint}:`, cacheError instanceof Error ? cacheError.message : String(cacheError));
      }
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}${endpoint}`, {
          headers: this.getAuthHeaders(),
          timeout: 30000,
        }),
      );

      const parsed = await parseStringPromise(response.data, {
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
      });

      // Store in cache if caching is enabled
      if (this.cacheEnabled && this.redis) {
        try {
          const tournamentDetails = this.getCacheType(endpoint) === 'tournamentDetails' ? (parsed as TournamentDetailsResponse) : undefined;
          const ttl = this.determineTtl(endpoint, tournamentDetails);
          await this.redis.setex(cacheKey, ttl, JSON.stringify(parsed));
          this.logger.debug(`Cached result for endpoint: ${endpoint} (TTL: ${ttl}s)`);
        } catch (cacheError) {
          this.logger.warn(`Cache write failed for ${endpoint}:`, cacheError instanceof Error ? cacheError.message : String(cacheError));
        }
      }

      return parsed as T;
    } catch (error) {
      throw new Error(`Tournament API request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear cache for specific endpoint or all tournament API cache
   */
  async clearCache(endpoint?: string): Promise<void> {
    if (!this.cacheEnabled || !this.redis) {
      return;
    }

    try {
      if (endpoint) {
        const cacheKey = this.generateCacheKey(endpoint);
        await this.redis.del(cacheKey);
        this.logger.debug(`Cleared cache for endpoint: ${endpoint}`);
      } else {
        await this.clearCacheByPattern(this.generateCacheKey('*'));
      }
    } catch (error) {
      this.logger.warn(`Failed to clear cache:`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Clear cache keys matching a glob pattern using SCAN (production-safe, non-blocking).
   * Returns the number of keys deleted.
   */
  async clearCacheByPattern(pattern: string): Promise<number> {
    if (!this.cacheEnabled || !this.redis) {
      return 0;
    }

    let deleted = 0;
    let cursor = '0';

    try {
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.redis.del(...keys);
          deleted += keys.length;
        }
      } while (cursor !== '0');

      this.logger.debug(`Cleared ${deleted} cache keys matching pattern: ${pattern}`);
    } catch (error) {
      this.logger.warn(`Failed to clear cache by pattern ${pattern}:`, error instanceof Error ? error.message : String(error));
    }

    return deleted;
  }

  /**
   * Clear all cached data for a tournament and its children (events, draws, matches).
   * The tournament code appears in all child endpoint URLs.
   */
  async clearCacheForTournament(tournamentCode: string): Promise<number> {
    const pattern = `tournament-api:*/Tournament/${tournamentCode}*`;
    return this.clearCacheByPattern(pattern);
  }

  /**
   * Check Redis connection status
   */
  get cacheStatus(): string {
    if (!this.cacheEnabled) return 'disabled';
    if (!this.redis) return 'not_configured';
    return this.redis.status;
  }

  /**
   * Discover tournaments with optional filters
   */
  async discoverTournaments(options?: { refDate?: string; pageSize?: number; searchTerm?: string }): Promise<Tournament[]> {
    const params = new URLSearchParams();

    if (options?.searchTerm) {
      params.append('q', options.searchTerm);
    } else {
      params.append('list', '1');
      params.append('refdate', options?.refDate || '2014-01-01');
    }

    params.append('pagesize', (options?.pageSize || 100).toString());

    const response = await this.makeRequest<TournamentListResponse>(`/1.0/Tournament?${params.toString()}`);
    return Array.isArray(response.Result.Tournament) ? response.Result.Tournament : [response.Result.Tournament];
  }

  /**
   * Get detailed tournament information
   */
  async getTournamentDetails(tournamentCode: string): Promise<Tournament> {
    const response = await this.makeRequest<TournamentDetailsResponse>(`/1.0/Tournament/${tournamentCode}`);
    return response.Result.Tournament;
  }

  /**
   * Get tournament events
   */
  async getTournamentEvents(tournamentCode: string, eventCode?: string): Promise<TournamentEvent[]> {
    const endpoint = eventCode ? `/1.0/Tournament/${tournamentCode}/Event/${eventCode}` : `/1.0/Tournament/${tournamentCode}/Event`;

    const response = await this.makeRequest<TournamentEventsResponse>(endpoint);
    return Array.isArray(response.Result.TournamentEvent) ? response.Result.TournamentEvent : [response.Result.TournamentEvent];
  }

  /**
   * Get tournament teams
   */
  async getTournamentTeams(tournamentCode: string, teamCode?: string): Promise<Team[]> {
    const endpoint = teamCode ? `/1.0/Tournament/${tournamentCode}/Team/${teamCode}` : `/1.0/Tournament/${tournamentCode}/Team`;

    const response = await this.makeRequest<TournamentTeamsResponse>(endpoint);
    return Array.isArray(response.Result.Team) ? response.Result.Team : [response.Result.Team];
  }

  /**
   * Get event entries (for individual tournaments)
   */
  async getEventEntries(tournamentCode: string, eventCode: string): Promise<Entry[]> {
    const response = await this.makeRequest<TournamentEntriesResponse>(`/1.0/Tournament/${tournamentCode}/Event/${eventCode}/Entry`);
    return Array.isArray(response.Result.Entry) ? response.Result.Entry : [response.Result.Entry];
  }

  /**
   * Get tournament draw
   */
  async getTournamentDraw(tournamentCode: string, drawCode: string): Promise<TournamentDraw> {
    const response = await this.makeRequest<TournamentDrawResponse>(`/1.0/Tournament/${tournamentCode}/Draw/${drawCode}`);
    return response.Result.TournamentDraw;
  }

  /**
   * Get event draws
   */
  async getEventDraws(tournamentCode: string, eventCode: string, drawCode?: string): Promise<TournamentDraw[]> {
    const endpoint = drawCode
      ? `/1.0/Tournament/${tournamentCode}/Event/${eventCode}/Draw/${drawCode}`
      : `/1.0/Tournament/${tournamentCode}/Event/${eventCode}/Draw`;

    const response = await this.makeRequest<TournamentDrawResponse>(endpoint);
    return Array.isArray(response.Result.TournamentDraw) ? response.Result.TournamentDraw : [response.Result.TournamentDraw];
  }

  /**
   * Get matches by date
   */
  async getMatchesByDate(tournamentCode: string, date: string): Promise<Match[]> {
    const response = await this.makeRequest<MatchesResponse>(`/1.0/Tournament/${tournamentCode}/Match/${date}`);
    return Array.isArray(response.Result.Match) ? response.Result.Match : [response.Result.Match];
  }

  /**
   * Get matches by draw
   */
  async getMatchesByDraw(tournamentCode: string, drawCode: string): Promise<Match[]> {
    const response = await this.makeRequest<MatchesResponse>(`/1.0/Tournament/${tournamentCode}/Draw/${drawCode}/Match`);
    return Array.isArray(response.Result.Match) ? response.Result.Match : [response.Result.Match];
  }

  /**
   * Get detailed match information
   */
  async getMatchDetails(tournamentCode: string, matchCode: string): Promise<Match> {
    const response = await this.makeRequest<MatchResponse>(`/1.0/Tournament/${tournamentCode}/MatchDetail/${matchCode}`);
    return response.Result.Match;
  }

  /**
   * Get all individual matches within a team encounter (for competitions)
   * Returns all games played in one encounter (e.g., 8 games: 4 doubles + 4 singles)
   */
  async getTeamMatchGames(tournamentCode: string, encounterCode: string): Promise<Match[]> {
    const response = await this.makeRequest<MatchesResponse>(`/1.0/Tournament/${tournamentCode}/TeamMatch/${encounterCode}`);
    return Array.isArray(response.Result.Match) ? response.Result.Match : response.Result.Match ? [response.Result.Match] : [];
  }

  /**
   * Get tournament stages
   */
  async getTournamentStages(tournamentCode: string): Promise<Stage[]> {
    const response = await this.makeRequest<StagesResponse>(`/1.0/Tournament/${tournamentCode}/Stages`);
    return Array.isArray(response.Result.Stage) ? response.Result.Stage : [response.Result.Stage];
  }

  /**
   * Get club teams for a specific club in a tournament
   */
  async getClubTeams(tournamentCode: string, clubCode: string): Promise<Team[]> {
    const response = await this.makeRequest<TournamentTeamsResponse>(`/1.0/Tournament/${tournamentCode}/Club/${clubCode}/Team`);
    return Array.isArray(response.Result.Team) ? response.Result.Team : [response.Result.Team];
  }

  /**
   * Get event teams for a specific event
   */
  async getEventTeams(tournamentCode: string, eventCode: string, teamCode?: string): Promise<Team[]> {
    const endpoint = teamCode
      ? `/1.0/Tournament/${tournamentCode}/Event/${eventCode}/Team/${teamCode}`
      : `/1.0/Tournament/${tournamentCode}/Event/${eventCode}/Team`;

    const response = await this.makeRequest<TournamentTeamsResponse>(endpoint);
    return Array.isArray(response.Result.Team) ? response.Result.Team : [response.Result.Team];
  }

  /**
   * Get draw entries
   */
  async getDrawEntries(tournamentCode: string, drawCode: string): Promise<Entry[]> {
    const response = await this.makeRequest<TournamentEntriesResponse>(`/1.0/Tournament/${tournamentCode}/Draw/${drawCode}/Entry`);
    return Array.isArray(response.Result.Entry) ? response.Result.Entry : [response.Result.Entry];
  }

  /**
   * Get encounter details (individual match within an encounter - returns player-level data)
   */
  async getEncounterDetails(tournamentCode: string, encounterCode: string): Promise<Match> {
    const response = await this.makeRequest<MatchResponse>(`/1.0/Tournament/${tournamentCode}/TeamMatch/${encounterCode}`);
    return response.Result.Match;
  }

  /**
   * Get encounters (team matches) by draw for competitions
   * Returns TeamMatch[] with team-level data (not individual player data)
   */
  async getEncountersByDraw(tournamentCode: string, drawCode: string): Promise<TeamMatch[]> {
    const response = await this.makeRequest<TeamMatchesResponse>(`/1.0/Tournament/${tournamentCode}/Draw/${drawCode}/Match`);
    return Array.isArray(response.Result.TeamMatch) ? response.Result.TeamMatch : response.Result.TeamMatch ? [response.Result.TeamMatch] : [];
  }

  /**
   * Get draw details
   */
  async getDrawDetails(tournamentCode: string, drawCode: string): Promise<TournamentDraw> {
    return this.getTournamentDraw(tournamentCode, drawCode);
  }
}
