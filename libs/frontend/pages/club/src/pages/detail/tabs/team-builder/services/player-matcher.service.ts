import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { SurveyResponse } from '../types/survey-response';

export interface MatchedPlayer {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gender?: string;
  slug?: string;
  memberId?: string;
  rankingLastPlaces?: {
    id: string;
    single: number;
    double: number;
    mix: number;
  }[];
}

export interface MatchResult {
  survey: SurveyResponse;
  player: MatchedPlayer | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  editing?: boolean;
  createNew?: boolean;
}

const PLAYERS_BY_IDS_QUERY = gql`
  query TeamBuilderPlayersByIds($args: PlayerArgs, $rankingLastPlacesArgs: RankingLastPlaceArgs) {
    players(args: $args) {
      id
      fullName
      firstName
      lastName
      gender
      slug
      memberId
      rankingLastPlaces(args: $rankingLastPlacesArgs) {
        id
        single
        double
        mix
      }
    }
  }
`;

@Injectable()
export class PlayerMatcherService {
  private readonly http = inject(HttpClient);
  private readonly apollo = inject(Apollo);

  /**
   * Match survey responses to players. First tries to match against club players,
   * then falls back to the global search API for unmatched responses.
   */
  async matchPlayers(responses: SurveyResponse[], systemId: string, clubPlayers: MatchedPlayer[]): Promise<MatchResult[]> {
    const results: MatchResult[] = [];

    // First pass: match against club players locally
    for (const survey of responses) {
      const result = this.matchAgainstClubPlayers(survey, clubPlayers);
      results.push(result);
    }

    // Second pass: for unmatched responses, try the global search API
    const unmatchedIndices = results
      .map((r, i) => (r.player === null ? i : -1))
      .filter((i) => i >= 0);

    if (unmatchedIndices.length > 0) {
      const batchSize = 5;
      for (let i = 0; i < unmatchedIndices.length; i += batchSize) {
        const batchIndices = unmatchedIndices.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batchIndices.map((idx) => this.searchForPlayer(results[idx].survey)),
        );
        for (let j = 0; j < batchIndices.length; j++) {
          if (batchResults[j].player) {
            results[batchIndices[j]] = batchResults[j];
          }
        }
      }
    }

    // Fetch full player data with rankings for all matched players
    const matchedIds = results.filter((r) => r.player).map((r) => r.player!.id);

    if (matchedIds.length > 0) {
      const players = await this.fetchPlayersWithRankings(matchedIds, systemId);
      const playerMap = new Map(players.map((p) => [p.id, p]));

      for (const result of results) {
        if (result.player && playerMap.has(result.player.id)) {
          result.player = playerMap.get(result.player.id)!;
          result.survey.matchedPlayerId = result.player.id;
          result.survey.matchedPlayerName = result.player.fullName;
          result.survey.matchConfidence = result.confidence;
        }
      }
    }

    return results;
  }

  /**
   * Search for players by name. First filters club players locally,
   * then appends results from the global search API (excluding duplicates).
   */
  async searchPlayerByName(query: string, clubPlayers: MatchedPlayer[]): Promise<MatchedPlayer[]> {
    if (!query || query.length < 2) return [];

    const normalizedQuery = query.toLowerCase();

    // First: filter club players locally
    const clubMatches = clubPlayers.filter((p) =>
      p.fullName.toLowerCase().includes(normalizedQuery) ||
      p.firstName?.toLowerCase().includes(normalizedQuery) ||
      p.lastName?.toLowerCase().includes(normalizedQuery),
    );

    // Then: search the global API
    try {
      const searchResults = await lastValueFrom(
        this.http.get<Array<{ hit: { objectID: string; firstName?: string; lastName?: string; fullName?: string } }>>(
          `/api/v1/search`,
          { params: { query, types: 'players' } },
        ),
      );

      const clubIds = new Set(clubMatches.map((p) => p.id));
      const globalMatches = searchResults
        .filter((r) => !clubIds.has(r.hit.objectID))
        .map((r) => ({
          id: r.hit.objectID,
          fullName: r.hit.fullName ?? `${r.hit.firstName ?? ''} ${r.hit.lastName ?? ''}`.trim(),
          firstName: r.hit.firstName ?? '',
          lastName: r.hit.lastName ?? '',
        }));

      return [...clubMatches, ...globalMatches];
    } catch {
      return clubMatches;
    }
  }

  private matchAgainstClubPlayers(survey: SurveyResponse, clubPlayers: MatchedPlayer[]): MatchResult {
    if (!survey.fullName) {
      return { survey, player: null, confidence: 'none' };
    }

    let bestMatch: MatchedPlayer | null = null;
    let bestConfidence: 'high' | 'medium' | 'low' | 'none' = 'none';

    for (const player of clubPlayers) {
      const confidence = this.calculateConfidence(survey.fullName, player.fullName);
      if (confidence === 'high') {
        return { survey, player, confidence };
      }
      if (confidence === 'medium' && bestConfidence !== 'medium') {
        bestMatch = player;
        bestConfidence = confidence;
      }
    }

    if (bestMatch) {
      return { survey, player: bestMatch, confidence: bestConfidence as 'medium' };
    }

    return { survey, player: null, confidence: 'none' };
  }

  private async searchForPlayer(survey: SurveyResponse): Promise<MatchResult> {
    if (!survey.fullName) {
      return { survey, player: null, confidence: 'none' };
    }

    try {
      const searchResults = await lastValueFrom(
        this.http.get<Array<{ hit: { objectID: string; firstName?: string; lastName?: string; fullName?: string } }>>(
          `/api/v1/search`,
          { params: { query: survey.fullName, types: 'players' } },
        ),
      );

      if (searchResults.length === 0) {
        return { survey, player: null, confidence: 'none' };
      }

      const topHit = searchResults[0].hit;
      const player: MatchedPlayer = {
        id: topHit.objectID,
        fullName: topHit.fullName ?? `${topHit.firstName ?? ''} ${topHit.lastName ?? ''}`.trim(),
        firstName: topHit.firstName ?? '',
        lastName: topHit.lastName ?? '',
      };

      const confidence = this.calculateConfidence(survey.fullName, player.fullName);

      return { survey, player, confidence };
    } catch {
      return { survey, player: null, confidence: 'none' };
    }
  }

  private calculateConfidence(surveyName: string, playerName: string): 'high' | 'medium' | 'low' {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const a = normalize(surveyName);
    const b = normalize(playerName);

    if (a === b) return 'high';

    // Check if all parts of the survey name appear in the player name
    const partsA = a.split(/\s+/);
    const partsB = b.split(/\s+/);
    const allPartsMatch = partsA.every((part) => partsB.some((bp) => bp.includes(part) || part.includes(bp)));

    if (allPartsMatch && partsA.length >= 2) return 'high';
    if (allPartsMatch) return 'medium';

    return 'low';
  }

  private async fetchPlayersWithRankings(playerIds: string[], systemId: string): Promise<MatchedPlayer[]> {
    try {
      const result = await lastValueFrom(
        this.apollo.query<{ players: MatchedPlayer[] }>({
          query: PLAYERS_BY_IDS_QUERY,
          variables: {
            args: {
              where: { id: { in: playerIds } },
              take: playerIds.length,
            },
            rankingLastPlacesArgs: {
              where: [{ systemId: { eq: systemId } }],
            },
          },
        }),
      );

      return result.data?.players ?? [];
    } catch {
      return [];
    }
  }
}
