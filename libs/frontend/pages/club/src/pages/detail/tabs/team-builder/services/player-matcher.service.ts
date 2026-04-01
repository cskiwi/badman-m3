import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Player } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { SurveyResponse } from '../types/survey-response';

const OPTIONAL_NAME_PARTS = new Set([
  'de',
  'den',
  'der',
  'van',
  'von',
  'ten',
  'ter',
  'te',
  'da',
  'di',
  'do',
  'dos',
  'du',
  'la',
  'le',
  'el',
  'al',
  'del',
  'della',
]);

export interface MatchResult {
  survey: SurveyResponse;
  player: Player | null;
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
  async matchPlayers(responses: SurveyResponse[], systemId: string, clubPlayers: Player[]): Promise<MatchResult[]> {
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
    const matchedPlayers = results.flatMap((result) =>
      result.player ? [result.player] : [],
    );
    const matchedIds = Array.from(
      new Set(matchedPlayers.map((player) => player.id)),
    );

    if (matchedIds.length > 0) {
      const players = await this.fetchPlayersWithRankings(matchedIds, systemId);
      const playerMap = new Map(players.map((p) => [p.id, p]));

      for (const result of results) {
        if (!result.player) {
          continue;
        }

        const player = playerMap.get(result.player.id);
        if (!player) {
          continue;
        }

        result.player = player;
        result.survey.matchedPlayerId = result.player.id;
        result.survey.matchedPlayerName = result.player.fullName;
        result.survey.matchConfidence = result.confidence;
      }
    }

    return results;
  }

  /**
   * Search for players by name. First filters club players locally,
   * then appends results from the global search API (excluding duplicates).
   */
  async searchPlayerByName(query: string, clubPlayers: Player[]): Promise<Player[]> {
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
        } as Player));

      return [...clubMatches, ...globalMatches];
    } catch {
      return clubMatches;
    }
  }

  private matchAgainstClubPlayers(survey: SurveyResponse, clubPlayers: Player[]): MatchResult {
    const exactNameMatch = this.findExactNameMatch(survey.fullName, clubPlayers);
    if (exactNameMatch) {
      return { survey, player: exactNameMatch, confidence: 'high' };
    }

    const memberIdMatch = this.matchByMemberId(survey, clubPlayers);
    if (memberIdMatch) {
      return { survey, player: memberIdMatch, confidence: 'high' };
    }

    if (!survey.fullName) {
      return { survey, player: null, confidence: 'none' };
    }

    let bestMatch: Player | null = null;
    let bestConfidence: 'high' | 'medium' | 'low' | 'none' = 'none';

    for (const player of clubPlayers) {
      const confidence = this.calculateConfidence(survey.fullName, player.fullName);
      if (confidence === 'high' && bestConfidence !== 'high') {
        bestMatch = player;
        bestConfidence = confidence;
      }
      if (confidence === 'medium' && bestConfidence === 'none') {
        bestMatch = player;
        bestConfidence = confidence;
      }
    }

    if (bestMatch) {
      return {
        survey,
        player: bestMatch,
        confidence: bestConfidence as 'high' | 'medium',
      };
    }

    return { survey, player: null, confidence: 'none' };
  }

  private findExactNameMatch(
    surveyName: string,
    clubPlayers: Player[],
  ): Player | null {
    const normalizedSurveyName = this.normalizeText(surveyName, true);
    if (!normalizedSurveyName) {
      return null;
    }

    return clubPlayers.find(
      (player) => this.normalizeText(player.fullName, true) === normalizedSurveyName,
    ) ?? null;
  }

  private matchByMemberId(
    survey: SurveyResponse,
    clubPlayers: Player[],
  ): Player | null {
    const surveyIdentifiers = this.getSurveyIdentifiers(survey);
    if (surveyIdentifiers.length === 0) {
      return null;
    }

    for (const player of clubPlayers) {
      const normalizedMemberId = this.normalizeIdentifier(player.memberId);
      if (
        normalizedMemberId
        && surveyIdentifiers.includes(normalizedMemberId)
      ) {
        return player;
      }
    }

    return null;
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
      const player = {
        id: topHit.objectID,
        fullName: topHit.fullName ?? `${topHit.firstName ?? ''} ${topHit.lastName ?? ''}`.trim(),
        firstName: topHit.firstName ?? '',
        lastName: topHit.lastName ?? '',
      } as Player;

      const confidence = this.calculateConfidence(survey.fullName, player.fullName);

      return { survey, player, confidence };
    } catch {
      return { survey, player: null, confidence: 'none' };
    }
  }

  private calculateConfidence(surveyName: string, playerName: string): 'high' | 'medium' | 'low' {
    const a = this.normalizeText(surveyName, true);
    const b = this.normalizeText(playerName, true);

    if (a === b) return 'high';

    const partsA = this.getComparableNameParts(a);
    const partsB = this.getComparableNameParts(b);
    if (partsA.length === 0 || partsB.length === 0) {
      return 'low';
    }

    const allPartsMatch = partsA.every((part) =>
      partsB.some((candidate) => this.isComparableNamePartMatch(part, candidate)),
    );

    if (allPartsMatch && partsA.length >= 2) return 'high';
    if (allPartsMatch) return 'medium';

    return 'low';
  }

  private getComparableNameParts(value: string): string[] {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .filter((part) => part.length > 1)
      .filter((part) => !OPTIONAL_NAME_PARTS.has(part));
  }

  private isComparableNamePartMatch(part: string, candidate: string): boolean {
    if (part === candidate) {
      return true;
    }

    if (part.length < 3 || candidate.length < 3) {
      return false;
    }

    return part.startsWith(candidate) || candidate.startsWith(part);
  }

  private getSurveyIdentifiers(survey: SurveyResponse): string[] {
    const identifiers = [survey.externalId, ...survey.linkedContactIds]
      .map((value) => this.normalizeIdentifier(value))
      .filter(Boolean);

    return Array.from(new Set(identifiers));
  }

  private normalizeIdentifier(value?: string): string {
    return this.normalizeText(value ?? '', false);
  }

  private normalizeText(value: string, keepSpaces: boolean): string {
    const normalized = value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '');

    if (keepSpaces) {
      return normalized.replace(/[^a-z0-9\s]/g, '').trim();
    }

    return normalized.replace(/[^a-z0-9]/g, '');
  }

  private async fetchPlayersWithRankings(playerIds: string[], systemId: string): Promise<Player[]> {
    try {
      const result = await lastValueFrom(
        this.apollo.query<{ players: Player[] }>({
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
