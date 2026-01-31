import {
  TournamentDraw as TournamentDrawModel,
  Entry as EntryModel,
  Game,
  Standing,
} from '@app/models';
import { GameStatus } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { In } from 'typeorm';

export interface TournamentStandingSyncData {
  drawId: string; // Required internal ID
}

@Injectable()
export class TournamentStandingSyncService {
  private readonly logger = new Logger(TournamentStandingSyncService.name);

  async processStandingSync(data: TournamentStandingSyncData, updateProgress: (progress: number) => Promise<void>): Promise<void> {
    this.logger.log(`Processing tournament standing sync`);
    await updateProgress(10);
    const { drawId } = data;

    try {
      // Step 1: Load the draw by internal ID
      await updateProgress(15);
      const draw = await TournamentDrawModel.findOne({
        where: { id: drawId },
        relations: ['tournamentSubEvent', 'tournamentSubEvent.tournamentEvent'],
      });
      await updateProgress(40);

      if (!draw) {
        throw new Error(`Tournament draw with id ${drawId} not found`);
      }

      const drawCode = draw.visualCode;
      this.logger.debug(`Found draw: ${draw.id} with code ${drawCode}, subeventId: ${draw.subeventId}`);

      // Calculate standings locally from games
      await updateProgress(50);
      this.logger.debug(`Starting standings calculation for draw ${drawCode}`);
      const calculatedStandings = await this.calculateStandingsFromGames(draw);
      await updateProgress(80);
      this.logger.debug(`Calculated ${calculatedStandings.length} standings for draw ${drawCode}`);

      if (calculatedStandings.length > 0) {
        this.logger.debug(`Updating ${calculatedStandings.length} standings in database`);
        await this.updateCalculatedStandings(draw, calculatedStandings);
        this.logger.log(`Calculated and updated ${calculatedStandings.length} standings for draw ${drawCode}`);
      } else {
        this.logger.debug(`No games found for standings calculation for draw ${drawCode}`);
      }

      this.logger.log(`Completed tournament standing sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament standing sync: ${errorMessage}`, error);
      throw error;
    }
  }

  private async calculateStandingsFromGames(draw: TournamentDrawModel): Promise<any[]> {
    this.logger.debug(`Starting calculateStandingsFromGames for draw ${draw.id} (${draw.visualCode})`);

    // Get all entries for this draw
    const entries = await EntryModel.find({
      where: { drawId: draw.id },
      relations: ['player1', 'player2'],
    });

    this.logger.debug(`Found ${entries.length} entries for draw ${draw.id}`);
    if (entries.length === 0) {
      this.logger.debug(`No entries found for draw ${draw.id}`);
      return [];
    }

    // Get all games for this draw - only count games with a determined winner
    const games = await Game.find({
      where: {
        linkId: draw.id,
        linkType: 'tournament',
        status: GameStatus.NORMAL, // Only count completed games
      },
      relations: ['gamePlayerMemberships'],
    }).then(games => games.filter(game => game.winner === 1 || game.winner === 2));

    this.logger.debug(`Found ${games.length} completed games with winner for draw ${draw.id}`);
    if (games.length === 0) {
      this.logger.debug(`No completed games with winner found for draw ${draw.id}`);
      return [];
    }

    this.logger.debug(`Calculating standings for ${entries.length} entries from ${games.length} games`);

    // Initialize standings for each entry
    const standingsMap = new Map();

    entries.forEach((entry) => {
      standingsMap.set(entry.id, {
        entryId: entry.id,
        played: 0,
        points: 0,
        gamesWon: 0,
        gamesLost: 0,
        setsWon: 0,
        setsLost: 0,
        totalPointsWon: 0,
        totalPointsLost: 0,
        won: 0,
        lost: 0,
        tied: 0,
      });
    });

    // Process each game
    for (const game of games) {
      const playerMemberships = game.gamePlayerMemberships || [];

      if (playerMemberships.length === 0) {
        this.logger.debug(`No player memberships found for game ${game.id}`);
        continue;
      }

      // Group players by team
      const team1PlayerIds = playerMemberships
        .filter((pm) => pm.team === 1)
        .map((pm) => pm.playerId)
        .filter((id): id is string => id !== undefined);
      const team2PlayerIds = playerMemberships
        .filter((pm) => pm.team === 2)
        .map((pm) => pm.playerId)
        .filter((id): id is string => id !== undefined);

      // Find corresponding entries
      const team1Entry = this.findEntryForPlayerIds(entries, team1PlayerIds);
      const team2Entry = this.findEntryForPlayerIds(entries, team2PlayerIds);

      if (team1Entry && team2Entry) {
        const team1Stats = standingsMap.get(team1Entry.id);
        const team2Stats = standingsMap.get(team2Entry.id);

        // Count played games
        team1Stats.played++;
        team2Stats.played++;

        // Calculate set results
        const sets = [
          { team1: game.set1Team1, team2: game.set1Team2 },
          { team1: game.set2Team1, team2: game.set2Team2 },
          { team1: game.set3Team1, team2: game.set3Team2 },
        ].filter((set) => set.team1 !== null && set.team2 !== null && set.team1 !== undefined && set.team2 !== undefined) as Array<{
          team1: number;
          team2: number;
        }>;

        let team1SetsWon = 0;
        let team2SetsWon = 0;

        sets.forEach((set) => {
          team1Stats.totalPointsWon += set.team1;
          team1Stats.totalPointsLost += set.team2;
          team2Stats.totalPointsWon += set.team2;
          team2Stats.totalPointsLost += set.team1;

          if (set.team1 > set.team2) {
            team1SetsWon++;
            team1Stats.setsWon++;
            team2Stats.setsLost++;
          } else {
            team2SetsWon++;
            team2Stats.setsWon++;
            team1Stats.setsLost++;
          }
        });

        // Determine game winner based on the winner field or set count
        const gameWinner = game.winner || (team1SetsWon > team2SetsWon ? 1 : 2);

        if (gameWinner === 1) {
          team1Stats.gamesWon++;
          team1Stats.won++;
          team1Stats.points += 2; // 2 points for a win
          team2Stats.gamesLost++;
          team2Stats.lost++;
        } else if (gameWinner === 2) {
          team2Stats.gamesWon++;
          team2Stats.won++;
          team2Stats.points += 2;
          team1Stats.gamesLost++;
          team1Stats.lost++;
        } else {
          // Tie (should be rare in badminton)
          team1Stats.tied++;
          team2Stats.tied++;
          team1Stats.points += 1;
          team2Stats.points += 1;
        }
      } else {
        this.logger.debug(`Could not find entries for game ${game.id} players`);
      }
    }

    // Convert to array and sort
    const standings = Array.from(standingsMap.values()).filter((s) => s.played > 0);
    standings.sort((a, b) => {
      // Sort by points (descending), then by games won, then by sets won, then by total points won
      if (b.points !== a.points) return b.points - a.points;
      if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
      return b.totalPointsWon - a.totalPointsWon;
    });

    // Assign positions
    standings.forEach((standing, index) => {
      standing.position = index + 1;
    });

    this.logger.debug(`Calculated ${standings.length} standings`);
    return standings;
  }

  private findEntryForPlayerIds(entries: EntryModel[], playerIds: string[]): EntryModel | null {
    return (
      entries.find((entry) => {
        if (playerIds.length === 1) {
          // Singles match
          return entry.player1Id === playerIds[0] && !entry.player2Id;
        } else if (playerIds.length === 2) {
          // Doubles match
          const sortedPlayerIds = playerIds.sort();
          const entryPlayerIds = [entry.player1Id, entry.player2Id].filter(Boolean).sort();
          return JSON.stringify(sortedPlayerIds) === JSON.stringify(entryPlayerIds);
        }
        return null;
      }) || null
    );
  }

  private async updateCalculatedStandings(draw: TournamentDrawModel, standings: any[]): Promise<void> {
    // Clear existing standings for this draw
    const existingStandings = await Standing.find({
      where: {
        entryId: In(standings.map((s) => s.entryId)),
      },
    });

    // Remove existing standings
    for (const existing of existingStandings) {
      await existing.remove();
    }

    // Create new standings
    for (const standingData of standings) {
      const newStanding = new Standing();
      newStanding.entryId = standingData.entryId;
      newStanding.position = standingData.position;
      newStanding.points = standingData.points;
      newStanding.played = standingData.played;
      newStanding.gamesWon = standingData.gamesWon;
      newStanding.gamesLost = standingData.gamesLost;
      newStanding.setsWon = standingData.setsWon;
      newStanding.setsLost = standingData.setsLost;
      newStanding.totalPointsWon = standingData.totalPointsWon;
      newStanding.totalPointsLost = standingData.totalPointsLost;
      newStanding.won = standingData.won;
      newStanding.lost = standingData.lost;
      newStanding.tied = standingData.tied;
      newStanding.size = draw.size;
      await newStanding.save();
    }
  }
}
