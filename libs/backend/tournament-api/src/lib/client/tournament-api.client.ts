import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { parseStringPromise } from 'xml2js';
import {
  Tournament,
  TournamentEvent,
  Team,
  Entry,
  TournamentDraw,
  Match,
  Stage,
  TournamentListResponse,
  TournamentDetailsResponse,
  TournamentEventsResponse,
  TournamentTeamsResponse,
  TournamentEntriesResponse,
  TournamentDrawResponse,
  MatchResponse,
  MatchesResponse,
  StagesResponse,
} from '../types/tournament.types';

@Injectable()
export class TournamentApiClient {
  private readonly logger = new Logger(TournamentApiClient.name);
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('TOURNAMENT_API_BASE_URL', 'https://api.tournamentsoftware.com');
    this.username = this.configService.getOrThrow<string>('TOURNAMENT_API_USERNAME');
    this.password = this.configService.getOrThrow<string>('TOURNAMENT_API_PASSWORD');
  }

  private getAuthHeaders() {
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/xml',
      Accept: 'application/xml',
    };
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
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

      return parsed as T;
    } catch (error) {
      throw new Error(`Tournament API request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Discover tournaments with optional filters
   */
  async discoverTournaments(options?: {
    refDate?: string;
    pageSize?: number;
    searchTerm?: string;
  }): Promise<Tournament[]> {
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
    const endpoint = eventCode 
      ? `/1.0/Tournament/${tournamentCode}/Event/${eventCode}`
      : `/1.0/Tournament/${tournamentCode}/Event`;
    
    const response = await this.makeRequest<TournamentEventsResponse>(endpoint);
    return Array.isArray(response.Result.TournamentEvent) 
      ? response.Result.TournamentEvent 
      : [response.Result.TournamentEvent];
  }

  /**
   * Get tournament teams
   */
  async getTournamentTeams(tournamentCode: string, teamCode?: string): Promise<Team[]> {
    const endpoint = teamCode 
      ? `/1.0/Tournament/${tournamentCode}/Team/${teamCode}`
      : `/1.0/Tournament/${tournamentCode}/Team`;
    
    const response = await this.makeRequest<TournamentTeamsResponse>(endpoint);
    return Array.isArray(response.Result.Team) ? response.Result.Team : [response.Result.Team];
  }

  /**
   * Get event entries (for individual tournaments)
   */
  async getEventEntries(tournamentCode: string, eventCode: string): Promise<Entry[]> {
    const response = await this.makeRequest<TournamentEntriesResponse>(
      `/1.0/Tournament/${tournamentCode}/Event/${eventCode}/Entry`
    );
    return Array.isArray(response.Result.Entry) ? response.Result.Entry : [response.Result.Entry];
  }

  /**
   * Get tournament draw
   */
  async getTournamentDraw(tournamentCode: string, drawCode: string): Promise<TournamentDraw> {
    const response = await this.makeRequest<TournamentDrawResponse>(
      `/1.0/Tournament/${tournamentCode}/Draw/${drawCode}`
    );
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
    return Array.isArray(response.Result.TournamentDraw) 
      ? response.Result.TournamentDraw 
      : [response.Result.TournamentDraw];
  }

  /**
   * Get matches by date
   */
  async getMatchesByDate(tournamentCode: string, date: string): Promise<Match[]> {
    const response = await this.makeRequest<MatchesResponse>(
      `/1.0/Tournament/${tournamentCode}/Match/${date}`
    );
    return Array.isArray(response.Result.Match) ? response.Result.Match : [response.Result.Match];
  }

  /**
   * Get matches by draw
   */
  async getMatchesByDraw(tournamentCode: string, drawCode: string): Promise<Match[]> {
    const response = await this.makeRequest<MatchesResponse>(
      `/1.0/Tournament/${tournamentCode}/Draw/${drawCode}/Match`
    );
    return Array.isArray(response.Result.Match) ? response.Result.Match : [response.Result.Match];
  }

  /**
   * Get detailed match information
   */
  async getMatchDetails(tournamentCode: string, matchCode: string): Promise<Match> {
    const response = await this.makeRequest<MatchResponse>(
      `/1.0/Tournament/${tournamentCode}/MatchDetail/${matchCode}`
    );
    return response.Result.Match;
  }

  /**
   * Get team match details (for competitions)
   */
  async getTeamMatch(tournamentCode: string, matchCode: string): Promise<Match> {
    const response = await this.makeRequest<MatchResponse>(
      `/1.0/Tournament/${tournamentCode}/TeamMatch/${matchCode}`
    );
    return response.Result.Match;
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
    const response = await this.makeRequest<TournamentTeamsResponse>(
      `/1.0/Tournament/${tournamentCode}/Club/${clubCode}/Team`
    );
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
    const response = await this.makeRequest<TournamentEntriesResponse>(
      `/1.0/Tournament/${tournamentCode}/Draw/${drawCode}/Entry`
    );
    return Array.isArray(response.Result.Entry) ? response.Result.Entry : [response.Result.Entry];
  }

  /**
   * Get encounter details
   */
  async getEncounterDetails(tournamentCode: string, encounterCode: string): Promise<Match> {
    const response = await this.makeRequest<MatchResponse>(
      `/1.0/Tournament/${tournamentCode}/EncounterDetail/${encounterCode}`
    );
    return response.Result.Match;
  }

  /**
   * Get encounters by draw
   */
  async getEncountersByDraw(tournamentCode: string, drawCode: string): Promise<Match[]> {
    const response = await this.makeRequest<MatchesResponse>(
      `/1.0/Tournament/${tournamentCode}/Draw/${drawCode}/Encounter`
    );
    return Array.isArray(response.Result.Match) ? response.Result.Match : [response.Result.Match];
  }


  /**
   * Get draw details
   */
  async getDrawDetails(tournamentCode: string, drawCode: string): Promise<TournamentDraw> {
    return this.getTournamentDraw(tournamentCode, drawCode);
  }
}