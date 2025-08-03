import { Club, Team } from '@app/models';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Like } from 'typeorm';
import { TEAM_MATCHING_QUEUE, TeamMatchingJobData } from '../queues/sync.queue';

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
@Processor(TEAM_MATCHING_QUEUE)
export class TeamMatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(TeamMatchingProcessor.name);
  private readonly MATCH_THRESHOLD = 0.7; // Minimum score for automatic matching
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.9; // Score for high-confidence matches

  async process(job: Job<TeamMatchingJobData, void, string>): Promise<void> {
    this.logger.log(`Processing team matching job: ${job.id}`);

    try {
      const { tournamentCode, eventCode, unmatchedTeams } = job.data;

      // Initialize progress
      await job.updateProgress(0);

      // Get unmatched teams from database if not provided
      const teamsToMatch = unmatchedTeams || (await this.getUnmatchedTeams(tournamentCode, eventCode));

      this.logger.log(`Processing ${teamsToMatch.length} unmatched teams`);

      // Update progress after collecting teams to match
      if (teamsToMatch.length === 0) {
        await job.updateProgress(100);
        this.logger.log(`No teams to match for job: ${job.id}`);
        return;
      }

      // Process teams with progress tracking
      for (let i = 0; i < teamsToMatch.length; i++) {
        const externalTeam = teamsToMatch[i];
        await this.matchTeam(tournamentCode, externalTeam);

        // Update progress: calculate percentage completed
        const progressPercentage = Math.round(((i + 1) / teamsToMatch.length) * 100);
        await job.updateProgress(progressPercentage);

        this.logger.debug(`Processed team ${i + 1}/${teamsToMatch.length} (${progressPercentage}%): ${externalTeam.externalName}`);
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
    this.logger.debug(`Getting unmatched teams for tournament ${tournamentCode}, event ${eventCode}`);

    // For now, return empty array as we would need to create a separate mapping table
    // to track external teams and their match status. This would be implemented
    // once we have the tournament sync mapping entities created.
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
    const candidates: TeamMatchCandidate[] = [];

    try {
      // First, try to find teams by club name similarity
      const clubs = await Club.find({
        where: {
          name: Like(`%${externalTeam.clubName}%`),
        },
        relations: ['teams'],
      });

      for (const club of clubs) {
        if (club.teams) {
          for (const team of club.teams) {
            const score = this.calculateMatchScore(externalTeam, {
              id: team.id,
              name: team.name || '',
              clubName: club.name || '',
              teamNumber: team.teamNumber,
              gender: this.mapTeamTypeToGender(team.type),
            });

            if (score > 0.3) {
              // Only include reasonable matches
              candidates.push({
                id: team.id,
                name: team.name || '',
                clubName: club.name || '',
                teamNumber: team.teamNumber,
                gender: this.mapTeamTypeToGender(team.type),
                score,
              });
            }
          }
        }
      }

      // Also try direct team name matching
      const directMatches = await Team.find({
        where: {
          name: Like(`%${this.normalizeString(externalTeam.externalName)}%`),
        },
        relations: ['club'],
      });

      for (const team of directMatches) {
        const score = this.calculateMatchScore(externalTeam, {
          id: team.id,
          name: team.name || '',
          clubName: team.club?.name || '',
          teamNumber: team.teamNumber,
          gender: this.mapTeamTypeToGender(team.type),
        });

        // Add if not already in candidates
        if (!candidates.find((c) => c.id === team.id) && score > 0.3) {
          candidates.push({
            id: team.id,
            name: team.name || '',
            clubName: team.club?.name || '',
            teamNumber: team.teamNumber,
            gender: this.mapTeamTypeToGender(team.type),
            score,
          });
        }
      }

      this.logger.debug(`Found ${candidates.length} matching candidates for ${externalTeam.externalName}`);
      return candidates;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find matching candidates: ${errorMessage}`);
      return [];
    }
  }

  private calculateMatchScore(externalTeam: ExternalTeam, candidate: any): number {
    let score = 0;
    let weights = 0;

    // Club name similarity (40% weight)
    const clubSimilarity = this.calculateStringSimilarity(this.normalizeString(externalTeam.clubName), this.normalizeString(candidate.clubName));
    score += clubSimilarity * 0.4;
    weights += 0.4;

    // Team name similarity (30% weight)
    const nameSimilarity = this.calculateStringSimilarity(externalTeam.normalizedName, this.normalizeString(candidate.name));
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
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private async createTeamMatch(
    tournamentCode: string,
    externalTeam: ExternalTeam,
    matchedTeam: TeamMatchCandidate,
    matchType: string,
  ): Promise<void> {
    this.logger.debug(`Creating team match: ${externalTeam.externalName} -> ${matchedTeam.name} (${matchType})`);

    // For now, we'll log the successful match. In a full implementation,
    // this would update a tournament_software_teams mapping table
    // to link external tournament teams with internal team records.

    // This would typically involve:
    // 1. Creating/updating a TournamentSoftwareTeam entity
    // 2. Linking it to the matched Team entity
    // 3. Storing match metadata (score, type, timestamp)
  }

  private async queueForManualReview(
    tournamentCode: string,
    externalTeam: ExternalTeam,
    suggestions: TeamMatchCandidate[],
    errorMessage?: string,
  ): Promise<void> {
    this.logger.debug(`Queueing for manual review: ${externalTeam.externalName} with ${suggestions.length} suggestions`);

    // For now, we'll log the review item. In a full implementation,
    // this would create a ManualTeamReview entity for admin interface
    // to allow manual team matching and conflict resolution.

    const reviewSummary = {
      tournamentCode,
      externalTeam: externalTeam.externalName,
      topSuggestions: suggestions.slice(0, 3).map((s) => `${s.name} (${s.score.toFixed(3)})`),
      errorMessage,
    };

    this.logger.log(`Manual review needed:`, reviewSummary);
  }

  /**
   * Manual matching interface methods
   */
  async approveTeamMatch(tournamentCode: string, externalTeamCode: string, teamId: string): Promise<void> {
    this.logger.log(`Manually approved team match: ${externalTeamCode} -> ${teamId}`);

    // In a full implementation, this would:
    // 1. Validate the team exists
    // 2. Create the team match with 'manual' type
    // 3. Remove from manual review queue
    // 4. Update any related tournament data

    const team = await Team.findOne({ where: { id: teamId } });
    if (team) {
      this.logger.log(`Successfully linked external team ${externalTeamCode} to ${team.name}`);
    } else {
      this.logger.error(`Team ${teamId} not found for manual approval`);
    }
  }

  async rejectTeamMatch(tournamentCode: string, externalTeamCode: string, reason?: string): Promise<void> {
    this.logger.log(`Manually rejected team match: ${externalTeamCode}, reason: ${reason}`);

    // In a full implementation, this would:
    // 1. Mark the review item as rejected
    // 2. Optionally queue for new team creation
    // 3. Log the rejection reason for analysis
  }

  async createNewTeamFromExternal(tournamentCode: string, externalTeamCode: string, newTeamData: any): Promise<void> {
    this.logger.log(`Creating new team from external: ${externalTeamCode}`);

    // In a full implementation, this would:
    // 1. Extract team and club information from external data
    // 2. Create or find the club record
    // 3. Create a new team record linked to the club
    // 4. Link the external team to the new internal team

    try {
      const newTeam = new Team();
      newTeam.name = newTeamData.name;
      newTeam.teamNumber = newTeamData.teamNumber;
      newTeam.type = newTeamData.type;
      newTeam.season = newTeamData.season || new Date().getFullYear();

      await newTeam.save();
      this.logger.log(`Created new team: ${newTeam.name} (${newTeam.id})`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create new team: ${errorMessage}`);
    }
  }

  /**
   * Get manual review statistics
   */
  async getManualReviewStats(tournamentCode?: string) {
    // In a full implementation, this would query the manual review queue
    // For now, return placeholder stats
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
    // In a full implementation, this would query the manual review queue
    // For now, return empty array
    return [];
  }

  /**
   * Helper method to map team type enum to gender string
   */
  private mapTeamTypeToGender(teamType?: string): string | undefined {
    switch (teamType) {
      case 'MEN':
        return 'men';
      case 'WOMEN':
        return 'women';
      case 'MIXED':
        return 'mixed';
      default:
        return undefined;
    }
  }
}
