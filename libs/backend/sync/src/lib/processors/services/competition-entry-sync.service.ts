import { TournamentApiClient } from '@app/backend-tournament-api';
import { CompetitionDraw, Entry, Team as TeamModel, CompetitionEvent as CompetitionEventModel } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TeamMatchingService } from './team-matching.service';

export interface CompetitionEntrySyncData {
  tournamentCode: string;
  drawCode: string;
}

interface DrawTeamData {
  Code?: string;
  Name?: string;
}

@Injectable()
export class CompetitionEntrySyncService {
  private readonly logger = new Logger(CompetitionEntrySyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly teamMatchingService: TeamMatchingService,
  ) {}

  async processEntrySync(job: Job<CompetitionEntrySyncData>, updateProgress: (progress: number) => Promise<void>, token: string): Promise<void> {
    this.logger.log(`Processing competition entry sync`);
    await updateProgress(10);
    const { tournamentCode, drawCode } = job.data;

    try {
      // Find the competition event first to get proper context
      await updateProgress(15);
      const competitionEvent = await CompetitionEventModel.findOne({
        where: { visualCode: tournamentCode },
      });
      await updateProgress(20);

      if (!competitionEvent) {
        this.logger.warn(`Competition with code ${tournamentCode} not found, skipping entry sync`);
        return;
      }

      this.logger.debug(`Found competition: ${competitionEvent.id} with code ${tournamentCode}`);

      // Find the draw with competition context to avoid visualCode ambiguity
      await updateProgress(25);
      const draw = await CompetitionDraw.findOne({
        where: {
          visualCode: drawCode,
          competitionSubEvent: {
            competitionEvent: {
              id: competitionEvent.id,
            },
          },
        },
        relations: ['competitionSubEvent', 'competitionSubEvent.competitionEvent'],
      });
      await updateProgress(30);

      if (!draw) {
        this.logger.warn(`Draw with code ${drawCode} not found for competition ${tournamentCode}, skipping entry sync`);
        return;
      }

      this.logger.debug(`Found draw: ${draw.id} with code ${drawCode}, subeventId: ${draw.subeventId}`);

      // Get draw details from API to find teams in the draw structure
      await updateProgress(40);
      const drawData = await this.tournamentApiClient.getDrawDetails?.(tournamentCode, drawCode);
      await updateProgress(60);

      if (drawData?.Structure?.Item) {
        // Extract unique teams from the draw structure
        const teamsInDraw = this.extractTeamsFromDrawStructure(drawData.Structure.Item);
        this.logger.debug(`Found ${teamsInDraw.length} teams in draw structure`);

        // Create entries for each team found in the draw
        // Note: We only add entries, never remove them (in case admin moved a team)
        for (const teamData of teamsInDraw) {
          const result = await this.teamMatchingService.findTeam(teamData.Code, teamData.Name, competitionEvent);
          if (result.team) {
            await this.createOrUpdateEntry(draw, result.team, 'competition');
            this.logger.debug(`Matched team "${teamData.Name}" with confidence: ${result.confidence} (score: ${result.score.toFixed(3)})`);
          } else {
            this.logger.warn(`Team with code ${teamData.Code} / name ${teamData.Name} not found in system`);
          }
        }
      }

      await updateProgress(90);
      this.logger.log(`Completed competition entry sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition entry sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  /**
   * Extract unique teams from draw structure items
   */
  private extractTeamsFromDrawStructure(items: unknown[]): DrawTeamData[] {
    const teamMap = new Map<string, DrawTeamData>();

    for (const item of items) {
      const drawItem = item as { Team?: DrawTeamData };
      if (drawItem.Team?.Code || drawItem.Team?.Name) {
        const key = drawItem.Team.Code || drawItem.Team.Name || '';
        if (key && !teamMap.has(key)) {
          teamMap.set(key, {
            Code: drawItem.Team.Code,
            Name: drawItem.Team.Name,
          });
        }
      }
    }

    return Array.from(teamMap.values());
  }

  /**
   * Create or update an entry for a team in a draw
   * Note: Entries are only added, never removed (to handle team moves by admin)
   */
  async createOrUpdateEntry(draw: CompetitionDraw, team: TeamModel, entryType: string): Promise<void> {
    // Check if team entry already exists for this draw
    const existingTeamEntry = await Entry.findOne({
      where: {
        drawId: draw.id,
        teamId: team.id,
      },
    });

    if (!existingTeamEntry) {
      const newTeamEntry = new Entry();
      newTeamEntry.drawId = draw.id;
      newTeamEntry.subEventId = draw.subeventId;
      newTeamEntry.teamId = team.id;
      newTeamEntry.entryType = entryType;
      await newTeamEntry.save();
      this.logger.debug(`Created entry for team ${team.name} in draw ${draw.id}`);
    }
  }

}
