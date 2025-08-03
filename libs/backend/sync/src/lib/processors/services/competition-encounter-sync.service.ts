import { TournamentApiClient } from '@app/backend-tournament-api';
import { CompetitionDraw, CompetitionEncounter, Team as TeamModel } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';

export interface CompetitionEncounterSyncData {
  tournamentCode: string;
  drawCode?: string;
  encounterCodes?: string[];
}

@Injectable()
export class CompetitionEncounterSyncService {
  private readonly logger = new Logger(CompetitionEncounterSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
  ) {}

  async processEncounterSync(
    data: CompetitionEncounterSyncData,
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    this.logger.log(`Processing competition encounter sync`);
    const { tournamentCode, drawCode, encounterCodes } = data;

    try {
      let encounters: unknown[] = [];

      if (encounterCodes && encounterCodes.length > 0) {
        // Sync specific encounters
        for (const encounterCode of encounterCodes) {
          try {
            const encounter = await this.tournamentApiClient.getEncounterDetails?.(tournamentCode, encounterCode);
            if (encounter) {
              encounters.push(encounter);
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`Failed to get encounter ${encounterCode}: ${errorMessage}`);
          }
        }
      } else if (drawCode) {
        // Sync all encounters in a draw
        const drawEncounters = await this.tournamentApiClient.getEncountersByDraw?.(tournamentCode, drawCode);
        encounters = drawEncounters?.filter((encounter: unknown) => encounter != null) || [];
      }

      // Process encounters and their games
      for (let i = 0; i < encounters.length; i++) {
        const encounter = encounters[i];

        if (!encounter) {
          this.logger.warn(`Skipping undefined encounter at index ${i}`);
          continue;
        }

        await this.processEncounter(tournamentCode, encounter);

        // Update all games for this encounter
        const encounterData = encounter as { Games?: unknown[] };
        if (encounterData.Games) {
          for (const game of encounterData.Games) {
            await this.processGame(tournamentCode, game);
          }
        }

        const progressPercentage = Math.round(((i + 1) / encounters.length) * 100);
        await updateProgress(progressPercentage);
      }

      this.logger.log(`Completed competition encounter sync - processed ${encounters.length} encounters`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition encounter sync: ${errorMessage}`);
      throw error;
    }
  }

  private async processEncounter(tournamentCode: string, encounter: unknown): Promise<void> {
    const encounterData = encounter as {
      Code: string;
      DrawCode: string;
      Date?: string;
      OriginalDate?: string;
      HomeTeam?: unknown;
      AwayTeam?: unknown;
      HomeScore?: number;
      AwayScore?: number;
      StartHour?: string;
      EndHour?: string;
      Shuttle?: number;
    };

    this.logger.debug(`Processing encounter: ${encounterData.Code}`);

    // Find the draw this encounter belongs to
    const draw = await CompetitionDraw.findOne({
      where: { visualCode: encounterData.DrawCode },
    });

    if (!draw) {
      this.logger.warn(`Competition draw with code ${encounterData.DrawCode} not found, skipping encounter ${encounterData.Code}`);
      return;
    }

    // Find or create teams
    let homeTeam: TeamModel | null = null;
    let awayTeam: TeamModel | null = null;

    if (encounterData.HomeTeam) {
      homeTeam = await this.findOrCreateTeamFromEntry(encounterData.HomeTeam);
    }
    if (encounterData.AwayTeam) {
      awayTeam = await this.findOrCreateTeamFromEntry(encounterData.AwayTeam);
    }

    const existingEncounter = await CompetitionEncounter.findOne({
      where: { visualCode: encounterData.Code },
    });

    if (existingEncounter) {
      existingEncounter.date = encounterData.Date ? new Date(encounterData.Date) : undefined;
      existingEncounter.originalDate = encounterData.OriginalDate ? new Date(encounterData.OriginalDate) : undefined;
      existingEncounter.drawId = draw.id;
      existingEncounter.homeTeamId = homeTeam?.id;
      existingEncounter.awayTeamId = awayTeam?.id;
      existingEncounter.homeScore = encounterData.HomeScore;
      existingEncounter.awayScore = encounterData.AwayScore;
      existingEncounter.startHour = encounterData.StartHour;
      existingEncounter.endHour = encounterData.EndHour;
      existingEncounter.shuttle = `${encounterData.Shuttle}`;
      await existingEncounter.save();
    } else {
      const newEncounter = new CompetitionEncounter();
      newEncounter.visualCode = encounterData.Code;
      newEncounter.date = encounterData.Date ? new Date(encounterData.Date) : undefined;
      newEncounter.originalDate = encounterData.OriginalDate ? new Date(encounterData.OriginalDate) : undefined;
      newEncounter.drawId = draw.id;
      newEncounter.homeTeamId = homeTeam?.id;
      newEncounter.awayTeamId = awayTeam?.id;
      newEncounter.homeScore = encounterData.HomeScore;
      newEncounter.awayScore = encounterData.AwayScore;
      newEncounter.startHour = encounterData.StartHour;
      newEncounter.endHour = encounterData.EndHour;
      newEncounter.shuttle = `${encounterData.Shuttle}`;
      await newEncounter.save();
    }
  }

  private async processGame(tournamentCode: string, game: unknown): Promise<void> {
    // This would delegate to the game sync service
    // For now, just log it
    this.logger.debug(`Processing game from encounter: ${JSON.stringify(game)}`);
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
