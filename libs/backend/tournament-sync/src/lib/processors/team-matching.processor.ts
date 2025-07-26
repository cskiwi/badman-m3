import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import {
  TOURNAMENT_SYNC_QUEUE,
  TournamentSyncJobType,
  TeamMatchingJobData,
} from '../queues/tournament-sync.queue';

interface TeamMatchCandidate {
  id: string;
  name: string;
  clubName: string;
  teamNumber?: number;
  gender?: string;
  strength?: number;
  score: number; // Matching score (0-1, higher is better)
}

interface ExternalTeam {
  externalCode: string;
  externalName: string;
  normalizedName: string;
  clubName: string;
  teamNumber?: number;
  gender?: string;
  strength?: number;
}

@Injectable()
@Processor(TOURNAMENT_SYNC_QUEUE)
export class TeamMatchingProcessor {
  private readonly logger = new Logger(TeamMatchingProcessor.name);
  private readonly MATCH_THRESHOLD = 0.7; // Minimum score for automatic matching
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.9; // Score for high-confidence matches

  @Process(TournamentSyncJobType.TEAM_MATCHING)
  async processTeamMatching(job: Job<TeamMatchingJobData>): Promise<void> {
    this.logger.log(`Processing team matching job: ${job.id}`);
    
    try {
      const { tournamentCode, eventCode, unmatchedTeams } = job.data;
      
      // Get unmatched teams from database if not provided
      const teamsToMatch = unmatchedTeams || await this.getUnmatchedTeams(tournamentCode, eventCode);
      
      this.logger.log(`Processing ${teamsToMatch.length} unmatched teams`);
      
      for (const externalTeam of teamsToMatch) {
        await this.matchTeam(tournamentCode, externalTeam);
      }

      this.logger.log(`Completed team matching job: ${job.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process team matching: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  private async getUnmatchedTeams(tournamentCode: string, eventCode?: string): Promise<ExternalTeam[]> {
    // TODO: Query database for unmatched teams
    // SELECT * FROM tournament_software_teams 
    // WHERE tournament_code = ? 
    //   AND (event_code = ? OR ? IS NULL)
    //   AND matched_team_id IS NULL
    
    this.logger.debug(`Getting unmatched teams for tournament ${tournamentCode}, event ${eventCode}`);
    
    // For now, return empty array. In real implementation, this would return
    // properly structured ExternalTeam objects from the database
    return [];
  }

  private async matchTeam(tournamentCode: string, externalTeam: ExternalTeam): Promise<void> {
    this.logger.debug(`Matching team: ${externalTeam.externalName}`);
    
    try {
      // Get potential matches from our database
      const candidates = await this.findMatchingCandidates(externalTeam);
      
      if (candidates.length === 0) {
        this.logger.debug(`No candidates found for team: ${externalTeam.externalName}`);
        await this.queueForManualReview(tournamentCode, externalTeam, []);
        return;
      }

      // Sort by score (highest first)
      candidates.sort((a, b) => b.score - a.score);
      const bestMatch = candidates[0];

      if (bestMatch.score >= this.HIGH_CONFIDENCE_THRESHOLD) {
        // Automatic match with high confidence
        await this.createTeamMatch(tournamentCode, externalTeam, bestMatch, 'automatic_high_confidence');
        this.logger.log(`Auto-matched (high confidence): ${externalTeam.externalName} -> ${bestMatch.name} (score: ${bestMatch.score.toFixed(3)})`);
      } else if (bestMatch.score >= this.MATCH_THRESHOLD) {
        // Automatic match with medium confidence
        await this.createTeamMatch(tournamentCode, externalTeam, bestMatch, 'automatic_medium_confidence');
        this.logger.log(`Auto-matched (medium confidence): ${externalTeam.externalName} -> ${bestMatch.name} (score: ${bestMatch.score.toFixed(3)})`);
      } else {
        // Queue for manual review with suggestions
        await this.queueForManualReview(tournamentCode, externalTeam, candidates.slice(0, 5));
        this.logger.debug(`Queued for manual review: ${externalTeam.externalName} (best score: ${bestMatch.score.toFixed(3)})`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to match team ${externalTeam.externalName}: ${errorMessage}`);
      await this.queueForManualReview(tournamentCode, externalTeam, [], errorMessage);
    }
  }

  private async findMatchingCandidates(externalTeam: ExternalTeam): Promise<TeamMatchCandidate[]> {
    // TODO: Query database for potential team matches
    // This would typically query the Teams table with various matching criteria
    
    const candidates: TeamMatchCandidate[] = [];
    
    // For now, return empty array - in real implementation, this would:
    // 1. Query teams by normalized club name
    // 2. Filter by team number and gender if available
    // 3. Calculate fuzzy matching scores
    // 4. Return top candidates
    
    return candidates;
  }

  private calculateMatchScore(externalTeam: ExternalTeam, candidate: any): number {
    let score = 0;
    let weights = 0;

    // Club name similarity (40% weight)
    const clubSimilarity = this.calculateStringSimilarity(
      this.normalizeString(externalTeam.clubName),
      this.normalizeString(candidate.clubName)
    );
    score += clubSimilarity * 0.4;
    weights += 0.4;

    // Team name similarity (30% weight)
    const nameSimilarity = this.calculateStringSimilarity(
      externalTeam.normalizedName,
      this.normalizeString(candidate.name)
    );
    score += nameSimilarity * 0.3;
    weights += 0.3;

    // Team number match (15% weight)
    if (externalTeam.teamNumber && candidate.teamNumber) {
      const numberMatch = externalTeam.teamNumber === candidate.teamNumber ? 1 : 0;
      score += numberMatch * 0.15;
      weights += 0.15;
    }

    // Gender match (10% weight)
    if (externalTeam.gender && candidate.gender) {
      const genderMatch = externalTeam.gender === candidate.gender ? 1 : 0;
      score += genderMatch * 0.1;
      weights += 0.1;
    }

    // Strength similarity (5% weight)
    if (externalTeam.strength && candidate.strength) {
      const strengthDiff = Math.abs(externalTeam.strength - candidate.strength);
      const strengthSimilarity = Math.max(0, 1 - strengthDiff / 100); // Normalize to 0-1
      score += strengthSimilarity * 0.05;
      weights += 0.05;
    }

    // Normalize score by total weights used
    return weights > 0 ? score / weights : 0;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Implement Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) return 1;
    return 1 - distance / maxLength;
  }

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
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private normalizeString(str: string): string {
    return str.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private async createTeamMatch(
    tournamentCode: string,
    externalTeam: ExternalTeam,
    matchedTeam: TeamMatchCandidate,
    matchType: string
  ): Promise<void> {
    // TODO: Update database to link external team with internal team
    const matchData = {
      tournamentCode,
      externalTeamCode: externalTeam.externalCode,
      externalTeamName: externalTeam.externalName,
      matchedTeamId: matchedTeam.id,
      matchedTeamName: matchedTeam.name,
      matchScore: matchedTeam.score,
      matchType,
      matchedAt: new Date(),
    };

    this.logger.debug(`Creating team match:`, matchData);
    // await this.teamMatchRepository.create(matchData);
    
    // Also update the tournament_software_teams table
    // await this.updateExternalTeamMatch(externalTeam.externalCode, matchedTeam.id);
  }

  private async queueForManualReview(
    tournamentCode: string,
    externalTeam: ExternalTeam,
    suggestions: TeamMatchCandidate[],
    errorMessage?: string
  ): Promise<void> {
    // TODO: Insert into manual review queue
    const reviewData = {
      tournamentCode,
      externalTeamCode: externalTeam.externalCode,
      externalTeamName: externalTeam.externalName,
      externalTeamData: externalTeam,
      suggestions: suggestions.map(s => ({
        teamId: s.id,
        teamName: s.name,
        score: s.score,
      })),
      errorMessage,
      status: 'pending_review',
      createdAt: new Date(),
    };

    this.logger.debug(`Queueing for manual review:`, reviewData);
    // await this.manualReviewRepository.create(reviewData);
  }

  /**
   * Manual matching interface methods
   */
  async approveTeamMatch(
    tournamentCode: string,
    externalTeamCode: string,
    teamId: string
  ): Promise<void> {
    // TODO: Implement manual approval
    // 1. Get external team data
    // 2. Get internal team data
    // 3. Create match with 'manual' type
    // 4. Remove from manual review queue
    
    this.logger.log(`Manually approved team match: ${externalTeamCode} -> ${teamId}`);
  }

  async rejectTeamMatch(
    tournamentCode: string,
    externalTeamCode: string,
    reason?: string
  ): Promise<void> {
    // TODO: Implement manual rejection
    // 1. Mark as rejected in manual review queue
    // 2. Optionally create a new team entry if no suitable match exists
    
    this.logger.log(`Manually rejected team match: ${externalTeamCode}, reason: ${reason}`);
  }

  async createNewTeamFromExternal(
    tournamentCode: string,
    externalTeamCode: string,
    newTeamData: any
  ): Promise<void> {
    // TODO: Create a new team based on external team data
    // This would be used when no suitable match exists in the database
    
    this.logger.log(`Creating new team from external: ${externalTeamCode}`);
  }

  /**
   * Get manual review statistics
   */
  async getManualReviewStats(tournamentCode?: string) {
    // TODO: Query manual review queue for stats
    return {
      pendingReview: 0,
      approved: 0,
      rejected: 0,
      total: 0,
    };
  }

  /**
   * Get teams pending manual review
   */
  async getTeamsPendingReview(tournamentCode?: string, limit = 50) {
    // TODO: Query manual review queue
    return [];
  }
}