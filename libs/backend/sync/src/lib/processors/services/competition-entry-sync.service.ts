import { TournamentApiClient } from '@app/backend-tournament-api';
import { CompetitionDraw, Entry, Team as TeamModel } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { Job, WaitingChildrenError } from 'bullmq';

export interface CompetitionEntrySyncData {
  tournamentCode: string;
  drawCode: string;
}

@Injectable()
export class CompetitionEntrySyncService {
  private readonly logger = new Logger(CompetitionEntrySyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
  ) {}

  async processEntrySync(
    data: CompetitionEntrySyncData,
    updateProgress?: (progress: number) => Promise<void>,
    job?: Job,
    token?: string,
  ): Promise<void> {
    this.logger.log(`Processing competition entry sync`);
    await updateProgress?.(10);
    const { tournamentCode, drawCode } = data;

    try {
      // Find the draw
      await updateProgress?.(20);
      const draw = await CompetitionDraw.findOne({
        where: { visualCode: drawCode },
        relations: ['subevent'],
      });
      await updateProgress?.(30);

      if (!draw) {
        this.logger.warn(`Competition draw with code ${drawCode} not found, skipping entry sync`);
        return;
      }

      // Get and sync entries
      await updateProgress?.(40);
      const entries = await this.tournamentApiClient.getDrawEntries?.(tournamentCode, drawCode);
      await updateProgress?.(60);
      if (entries) {
        await this.updateCompetitionEntries(draw, entries);
      }
      await updateProgress?.(90);

      // Check if we should wait for children using BullMQ pattern
      if (job && token) {
        const shouldWait = await job.moveToWaitingChildren(token);
        if (shouldWait) {
          this.logger.log(`Competition entry sync waiting for child jobs`);
          throw new WaitingChildrenError();
        }
      }

      this.logger.log(`Completed competition entry sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition entry sync: ${errorMessage}`, error);
      throw error;
    }
  }

  private async updateCompetitionEntries(draw: CompetitionDraw, entries: unknown[]): Promise<void> {
    for (const entryData of entries) {
      const entry = entryData as { Team1: unknown; Team2?: unknown };
      
      // Find or create teams
      const team1 = await this.findOrCreateTeamFromEntry(entry.Team1);
      const team2 = entry.Team2 ? await this.findOrCreateTeamFromEntry(entry.Team2) : null;

      if (!team1) {
        this.logger.warn(`Could not find or create team for entry`);
        continue;
      }

      // Create entry for team1
      await this.createOrUpdateEntry(draw, team1, 'competition');

      // Create entry for team2 if it exists
      if (team2) {
        await this.createOrUpdateEntry(draw, team2, 'competition');
      }
    }
  }

  private async createOrUpdateEntry(draw: CompetitionDraw, team: TeamModel, entryType: string): Promise<void> {
    // Check if team entry already exists
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
    }
  }

  private async findOrCreateTeamFromEntry(teamData: unknown): Promise<TeamModel | null> {
    const team = teamData as { Code?: string; Name?: string };
    
    if (!team || !team.Code) {
      return null;
    }

    const existingTeam = await TeamModel.findOne({
      where: { name: team.Name },
    });

    if (existingTeam) {
      return existingTeam;
    }

    // Create minimal team record for API reference
    const newTeam = new TeamModel();
    newTeam.name = team.Name || `Team ${team.Code}`;
    // Note: Team model doesn't have visualCode, using name as identifier
    await newTeam.save();

    return newTeam;
  }
}
