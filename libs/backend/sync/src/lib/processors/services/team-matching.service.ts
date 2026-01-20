import { Club, Team as TeamModel, CompetitionEvent as CompetitionEventModel } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { Like } from 'typeorm';

export interface TeamMatchResult {
  team: TeamModel | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  score: number;
}

@Injectable()
export class TeamMatchingService {
  private readonly logger = new Logger(TeamMatchingService.name);

  /**
   * Find a team by visualCode, teamMatcher pattern, or fuzzy name matching
   * Uses multiple strategies in order of preference:
   * 1. Exact visualCode match (filtered by season)
   * 2. Event's teamMatcher regex pattern (filtered by season)
   * 3. Fuzzy name matching within state and season-filtered clubs
   *
   * Season filtering ensures teams are matched within the correct competition season.
   */
  async findTeam(
    visualCode: string | undefined,
    name: string | undefined,
    competitionEvent?: CompetitionEventModel | null,
  ): Promise<TeamMatchResult> {
    const season = competitionEvent?.season;

    if (!season) {
      throw new Error('Season is required for team matching. CompetitionEvent must have a valid season.');
    }

    if (!visualCode && !name) {
      return { team: null, confidence: 'none', score: 0 };
    }

    // 1. First try exact visualCode match (filtered by season)
    if (visualCode) {
      const teamByCode = await TeamModel.findOne({
        where: { visualCode, season },
        relations: ['club'],
      });

      if (teamByCode) {
        this.logger.debug(`Found team by visualCode: ${visualCode} (season: ${season})`);
        return { team: teamByCode, confidence: 'high', score: 1.0 };
      }
    }

    if (!name) {
      return { team: null, confidence: 'none', score: 0 };
    }

    // 2. Try teamMatcher pattern if event has one
    if (competitionEvent?.teamMatcher) {
      const matchedTeam = await this.matchByTeamMatcher(name, competitionEvent.teamMatcher, season);
      if (matchedTeam) {
        // Update visualCode for future matching
        if (visualCode && !matchedTeam.visualCode) {
          matchedTeam.visualCode = visualCode;
          await matchedTeam.save();
          this.logger.debug(`Updated team ${matchedTeam.name} with visualCode ${visualCode}`);
        }
        return { team: matchedTeam, confidence: 'high', score: 0.95 };
      }
    }

    // 3. Fuzzy match with state and season filtering
    const result = await this.fuzzyMatch(name, visualCode, competitionEvent?.state, season);

    // Update visualCode if we found a match
    if (result.team && visualCode && !result.team.visualCode) {
      result.team.visualCode = visualCode;
      await result.team.save();
      this.logger.debug(`Updated team ${result.team.name} with visualCode ${visualCode}`);
    }

    return result;
  }

  /**
   * Match team using the event's teamMatcher regex pattern
   */
  private async matchByTeamMatcher(apiName: string, teamMatcher: string, season: number): Promise<TeamModel | null> {
    try {
      const regex = new RegExp(teamMatcher, 'i');
      const match = apiName.match(regex);

      if (!match || !match.groups) {
        return null;
      }

      // Expected groups: clubName, teamNumber, gender (e.g., "1H", "2D")
      const { clubName, teamNumber, gender } = match.groups;

      if (!clubName) {
        return null;
      }

      // Find clubs matching the extracted name
      const clubs = await Club.find({
        where: [
          { name: Like(`%${clubName.trim()}%`) },
          { teamName: Like(`%${clubName.trim()}%`) },
          { abbreviation: Like(`%${clubName.trim()}%`) },
        ],
        relations: ['teams'],
      });

      for (const club of clubs) {
        if (!club.teams) continue;

        for (const team of club.teams) {
          // Filter by season
          if (team.season !== season) {
            continue;
          }

          // Match team number and gender
          const teamMatches = this.matchTeamNumberAndGender(team, teamNumber, gender);
          if (teamMatches) {
            this.logger.debug(`Matched team via teamMatcher: ${apiName} -> ${team.name} (season: ${season})`);
            return team;
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.warn(`Invalid teamMatcher regex: ${teamMatcher}`, error);
      return null;
    }
  }

  /**
   * Check if team matches the expected number and gender
   */
  private matchTeamNumberAndGender(team: TeamModel, teamNumber?: string, gender?: string): boolean {
    // Parse team number (e.g., "1", "2")
    const expectedNumber = teamNumber ? parseInt(teamNumber, 10) : undefined;

    if (expectedNumber && team.teamNumber !== expectedNumber) {
      return false;
    }

    // Map gender codes (H=Heren/Men, D=Dames/Women, G=Gemengd/Mixed)
    if (gender) {
      const genderMap: Record<string, string[]> = {
        H: ['M', 'MEN', 'HEREN'],
        D: ['F', 'WOMEN', 'DAMES', 'VROUWEN'],
        G: ['MX', 'MIXED', 'GEMENGD'],
      };

      const expectedTypes = genderMap[gender.toUpperCase()] || [];
      if (expectedTypes.length > 0 && team.type) {
        if (!expectedTypes.includes(team.type.toUpperCase())) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Fuzzy match team by name with optional state filtering and required season filtering
   */
  private async fuzzyMatch(
    apiName: string,
    visualCode: string | undefined,
    state: string | undefined,
    season: number,
  ): Promise<TeamMatchResult> {
    const normalizedApiName = this.normalizeTeamName(apiName);
    const parsed = this.parseTeamName(apiName);

    this.logger.debug(`Fuzzy matching: "${apiName}" -> normalized: "${normalizedApiName}", parsed: ${JSON.stringify(parsed)}, season: ${season}`);

    // Build club query with optional state filter
    const clubQuery: Record<string, unknown>[] = [];
    if (parsed.clubName) {
      const searchTerms = [
        { name: Like(`%${parsed.clubName}%`) },
        { teamName: Like(`%${parsed.clubName}%`) },
        { abbreviation: Like(`%${parsed.clubName}%`) },
      ];

      if (state) {
        clubQuery.push(...searchTerms.map((term) => ({ ...term, state })));
      } else {
        clubQuery.push(...searchTerms);
      }
    }

    let bestMatch: TeamModel | null = null;
    let bestScore = 0;

    // Search clubs
    if (clubQuery.length > 0) {
      const clubs = await Club.find({
        where: clubQuery,
        relations: ['teams'],
      });

      for (const club of clubs) {
        if (!club.teams) continue;

        for (const team of club.teams) {
          // Filter by season
          if (team.season !== season) {
            continue;
          }

          const score = this.calculateMatchScore(apiName, parsed, team, club);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = team;
          }
        }
      }
    }

    // Also try direct team name search with season filter
    const directMatches = await TeamModel.find({
      where: { name: Like(`%${parsed.clubName || normalizedApiName}%`), season },
      relations: ['club'],
    });

    for (const team of directMatches) {
      // If state filter is set, skip teams from clubs in other states
      if (state && team.club?.state && team.club.state !== state) {
        continue;
      }

      const score = this.calculateMatchScore(apiName, parsed, team, team.club || undefined);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = team;
      }
    }

    if (bestMatch) {
      const confidence = bestScore >= 0.8 ? 'high' : bestScore >= 0.6 ? 'medium' : 'low';
      this.logger.debug(`Fuzzy matched: "${apiName}" -> "${bestMatch.name}" (score: ${bestScore.toFixed(3)}, confidence: ${confidence}, season: ${season})`);
      return { team: bestMatch, confidence, score: bestScore };
    }

    this.logger.warn(`No match found for team: "${apiName}" (season: ${season})`);
    return { team: null, confidence: 'none', score: 0 };
  }

  /**
   * Parse team name to extract components
   * Examples:
   * - "Evergem 1H (79)" -> { clubName: "Evergem", teamNumber: 1, gender: "H" }
   * - "Lokerse BC 1D" -> { clubName: "Lokerse BC", teamNumber: 1, gender: "D" }
   * - "BC Brakel 2G" -> { clubName: "BC Brakel", teamNumber: 2, gender: "G" }
   */
  private parseTeamName(name: string): { clubName: string; teamNumber?: number; gender?: string } {
    // Remove trailing parenthetical content like "(79)"
    const cleanName = name.replace(/\s*\([^)]*\)\s*$/, '').trim();

    // Match patterns like "Club Name 1H", "Club Name 2D", etc.
    const match = cleanName.match(/^(.+?)\s+(\d+)([HDGMFhdgmf])?\s*$/);

    if (match) {
      return {
        clubName: match[1].trim(),
        teamNumber: parseInt(match[2], 10),
        gender: match[3]?.toUpperCase(),
      };
    }

    // Try pattern without explicit gender: "Club Name 1"
    const simpleMatch = cleanName.match(/^(.+?)\s+(\d+)\s*$/);
    if (simpleMatch) {
      return {
        clubName: simpleMatch[1].trim(),
        teamNumber: parseInt(simpleMatch[2], 10),
      };
    }

    // No pattern matched, return entire name as club name
    return { clubName: cleanName };
  }

  /**
   * Calculate match score between API team name and database team
   */
  private calculateMatchScore(
    apiName: string,
    parsed: { clubName: string; teamNumber?: number; gender?: string },
    team: TeamModel,
    club?: Club,
  ): number {
    let score = 0;
    let weights = 0;

    // Club name similarity (50% weight)
    if (parsed.clubName && club) {
      const clubNameSimilarity = Math.max(
        this.calculateStringSimilarity(parsed.clubName, club.name || ''),
        this.calculateStringSimilarity(parsed.clubName, club.teamName || ''),
        this.calculateStringSimilarity(parsed.clubName, club.abbreviation || ''),
      );
      score += clubNameSimilarity * 0.5;
      weights += 0.5;
    } else if (parsed.clubName && team.name) {
      // Compare with team name directly if no club
      const nameSimilarity = this.calculateStringSimilarity(parsed.clubName, team.name);
      score += nameSimilarity * 0.5;
      weights += 0.5;
    }

    // Team number match (30% weight)
    if (parsed.teamNumber !== undefined) {
      if (team.teamNumber === parsed.teamNumber) {
        score += 0.3;
      }
      weights += 0.3;
    }

    // Gender match (20% weight)
    if (parsed.gender) {
      const genderMatch = this.genderMatches(parsed.gender, team.type);
      if (genderMatch) {
        score += 0.2;
      }
      weights += 0.2;
    }

    return weights > 0 ? score / weights : 0;
  }

  /**
   * Check if gender code matches team type
   */
  private genderMatches(genderCode: string, teamType?: string): boolean {
    if (!teamType) return true; // If no team type, don't penalize

    const genderMap: Record<string, string[]> = {
      H: ['M', 'MEN', 'HEREN'],
      D: ['F', 'WOMEN', 'DAMES', 'VROUWEN'],
      G: ['MX', 'MIXED', 'GEMENGD'],
      M: ['M', 'MEN', 'HEREN'],
      F: ['F', 'WOMEN', 'DAMES', 'VROUWEN'],
    };

    const expectedTypes = genderMap[genderCode.toUpperCase()] || [];
    return expectedTypes.includes(teamType.toUpperCase());
  }

  /**
   * Normalize team name for comparison
   */
  private normalizeTeamName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s*\([^)]*\)\s*/g, '') // Remove parenthetical content
      .replace(/\bbc\b/gi, '') // Remove "BC" (badminton club)
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Quick checks
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Check if one contains the other
    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.9;
    }

    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    if (str1.length === 0) return str2.length;
    if (str2.length === 0) return str1.length;

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Calculate distances
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
