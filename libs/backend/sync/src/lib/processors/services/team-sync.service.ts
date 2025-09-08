import { Team as TournamentTeam } from '@app/backend-tournament-api';
import { Team as TeamModel } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { SyncService } from '../../services/sync.service';

@Injectable()
export class TeamSyncService {
  private readonly logger = new Logger(TeamSyncService.name);

  constructor(private readonly syncService: SyncService) {}

  async processTeamSync(tournamentCode: string, teams: TournamentTeam[]): Promise<void> {
    this.logger.log(`Processing team sync for ${teams.length} teams`);
    
    for (const team of teams) {
      await this.createOrUpdateTeam(tournamentCode, team);
    }
    
    this.logger.log(`Completed team sync for ${teams.length} teams`);
  }

  private async createOrUpdateTeam(tournamentCode: string, team: TournamentTeam): Promise<void> {
    // Extract team information for matching
    const normalizedName = this.normalizeTeamName(team.Name);
    const clubName = this.extractClubName(team.Name);
    const teamNumber = this.extractTeamNumber(team.Name);
    const gender = this.extractTeamGender(team.Name);
    const strength = this.extractTeamStrength(team.Name);

    this.logger.debug(`Processing team: ${team.Name} (${team.Code})`);

    // Try to find existing team by normalized name and club
    const existingTeam = await TeamModel.findOne({
      where: {
        name: clubName,
        teamNumber: teamNumber ?? IsNull(),
      },
      relations: ['club'],
    });

    if (!existingTeam) {
      // Queue for team matching process
      await this.syncService.queueTeamMatching({
        tournamentCode,
        unmatchedTeams: [
          {
            externalCode: team.Code,
            externalName: team.Name,
            normalizedName,
            clubName,
            teamNumber: teamNumber ?? undefined,
            gender: gender ?? undefined,
            strength: strength ?? undefined,
          },
        ],
      });

      this.logger.debug(`Queued team for matching: ${team.Name}`);
    } else {
      this.logger.debug(`Found existing team: ${existingTeam.name} for ${team.Name}`);
    }
  }

  private normalizeTeamName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private extractClubName(name: string): string {
    // Extract club name from format: "Club Name 1H (41)"
    const match = name.match(/^(.+?)\s+\d+[HDG]\s*\(\d+\)$/);
    return match ? match[1].trim() : name;
  }

  private extractTeamNumber(name: string): number | null {
    const match = name.match(/\s(\d+)[HDG]\s*\(\d+\)$/);
    return match ? parseInt(match[1], 10) : null;
  }

  private extractTeamGender(name: string): string | null {
    const match = name.match(/\s\d+([HDG])\s*\(\d+\)$/);
    if (match) {
      switch (match[1]) {
        case 'H':
          return 'men';
        case 'D':
          return 'women';
        case 'G':
          return 'mixed';
      }
    }
    return null;
  }

  private extractTeamStrength(name: string): number | null {
    const match = name.match(/\((\d+)\)$/);
    return match ? parseInt(match[1], 10) : null;
  }
}