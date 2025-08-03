import { TournamentApiClient, Match } from '@app/backend-tournament-api';
import { Injectable, Logger } from '@nestjs/common';
import { CompetitionGameSyncService } from './competition-game-sync.service';

export interface CompetitionGameIndividualSyncData {
  tournamentCode: string;
  drawCode?: string;
  matchCodes?: string[];
}

@Injectable()
export class CompetitionGameIndividualSyncService {
  private readonly logger = new Logger(CompetitionGameIndividualSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly competitionGameSyncService: CompetitionGameSyncService,
  ) {}

  async processGameIndividualSync(
    data: CompetitionGameIndividualSyncData,
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    this.logger.log(`Processing competition game individual sync`);
    const { tournamentCode, drawCode, matchCodes } = data;

    try {
      let matches: Match[] = [];

      if (matchCodes && matchCodes.length > 0) {
        // Sync specific matches
        for (const matchCode of matchCodes) {
          try {
            const match = await this.tournamentApiClient.getTeamMatch(tournamentCode, matchCode);
            if (match) {
              matches.push(match);
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`Failed to get match ${matchCode}: ${errorMessage}`);
          }
        }
      } else if (drawCode) {
        // Sync all matches in a draw
        const drawMatches = await this.tournamentApiClient.getMatchesByDraw(tournamentCode, drawCode);
        matches = drawMatches?.filter((match) => match != null) || [];
      }

      // Process matches with progress tracking
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];

        if (!match) {
          this.logger.warn(`Skipping undefined match at index ${i}`);
          continue;
        }

        // Delegate to the game sync service
        await this.processMatch(tournamentCode, match);

        const progressPercentage = Math.round(((i + 1) / matches.length) * 100);
        await updateProgress(progressPercentage);
      }

      this.logger.log(`Completed competition game individual sync - processed ${matches.length} matches`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition game individual sync: ${errorMessage}`);
      throw error;
    }
  }

  private async processMatch(tournamentCode: string, match: Match): Promise<void> {
    // Delegate the actual match processing to the game sync service
    await this.competitionGameSyncService.processGameSync(
      {
        tournamentCode,
        matchCodes: [match.Code],
      },
      async (progress: number) => {
        // Progress tracking for individual match - just log it
        this.logger.debug(`Match ${match.Code} processing progress: ${progress}%`);
      },
    );
  }
}
