import { Entry, Match, TournamentApiClient, TournamentDraw, TournamentEvent, Player as TournamentPlayer } from '@app/backend-tournament-api';
import {
  Entry as EntryModel,
  Game,
  Player,
  Standing,
  TournamentDraw as TournamentDrawModel,
  TournamentEvent as TournamentEventModel,
  TournamentSubEvent,
} from '@app/models';
import { GameStatus, GameType } from '@app/models-enum';
import { InjectFlowProducer, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { In } from 'typeorm';
import { GameSyncJobData, StructureSyncJobData, SyncJobType, TOURNAMENT_EVENT_QUEUE } from '../queues/sync.queue';

@Injectable()
@Processor(TOURNAMENT_EVENT_QUEUE)
export class TournamentEventProcessor extends WorkerHost {
  private readonly logger = new Logger(TournamentEventProcessor.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    @InjectFlowProducer('tournament-sync') private readonly tournamentSyncFlow: FlowProducer,
  ) {
    super();
  }

  async process(job: Job<StructureSyncJobData | GameSyncJobData, void, string>, token: string): Promise<void> {
    switch (job.name) {
      case SyncJobType.TOURNAMENT_STRUCTURE_SYNC: {
        await this.processTournamentStructureSync(job as Job<StructureSyncJobData>);
        break;
      }
      case SyncJobType.TOURNAMENT_GAME_SYNC: {
        await this.processTournamentGameSync(job as Job<GameSyncJobData>);
        break;
      }
      case 'tournament-event-sync': {
        await this.processTournamentEventSync(job, token);
        break;
      }
      case 'tournament-subevent-sync': {
        await this.processTournamentSubEventSync(job, token);
        break;
      }
      case 'tournament-draw-sync': {
        await this.processTournamentDrawSync(job, token);
        break;
      }
      case 'tournament-standing-sync': {
        await this.processTournamentStandingSync(job);
        break;
      }
      case 'tournament-game-sync': {
        await this.processTournamentGameIndividualSync(job);
        break;
      }
      default: {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    }
  }

  private async processTournamentStructureSync(job: Job<StructureSyncJobData>): Promise<void> {
    this.logger.log(`Processing tournament structure sync job: ${job.id}`);

    try {
      const { tournamentCode, eventCodes } = job.data;

      // Initialize progress
      await job.updateProgress(0);

      // Get tournament details first
      const tournament = await this.tournamentApiClient.getTournamentDetails(tournamentCode);
      this.logger.log(`Syncing tournament structure for: ${tournament.Name}`);

      // Calculate total work units (3 main operations: events, entries, draws)
      const totalSteps = 3;
      let currentStep = 0;

      // Sync events
      await this.syncEvents(tournamentCode, eventCodes);
      currentStep++;
      await job.updateProgress(Math.round((currentStep / totalSteps) * 100));
      this.logger.debug(`Completed events sync (${currentStep}/${totalSteps})`);

      // Sync entries (players)
      await this.syncEntries(tournamentCode, eventCodes);
      currentStep++;
      await job.updateProgress(Math.round((currentStep / totalSteps) * 100));
      this.logger.debug(`Completed entries sync (${currentStep}/${totalSteps})`);

      // Sync draws
      await this.syncDraws(tournamentCode, eventCodes);
      currentStep++;
      await job.updateProgress(100);
      this.logger.debug(`Completed draws sync (${currentStep}/${totalSteps})`);

      this.logger.log(`Completed tournament structure sync job: ${job.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process tournament structure sync: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  private async processTournamentEventSync(job: Job, token: string): Promise<void> {
    this.logger.log(`Processing tournament event sync job: ${job.id}`);
    const { tournamentCode, eventCodes, includeSubComponents } = job.data;

    try {
      // Sync events first
      await this.syncEvents(tournamentCode, eventCodes);

      // If includeSubComponents, add sub-component sync jobs and wait for them
      if (includeSubComponents) {
        // Check if children have already been created by checking job data
        const jobData = job.data as any;
        if (jobData.childrenCreated) {
          this.logger.debug(`Job ${job.id} children already created, waiting for completion`);
          // Wait for existing children to complete
          const shouldWait = await job.moveToWaitingChildren(token);
          if (shouldWait) {
            throw new WaitingChildrenError();
          }
        } else {
          // Mark that we're creating children and create child jobs
          await job.updateData({ ...jobData, childrenCreated: true });
          
          const shortId = this.generateShortId();
          const subEventJobName = `subevent-${tournamentCode}-${shortId}`;

          this.logger.debug(`Creating sub-event job: ${subEventJobName}`);

          await this.tournamentSyncFlow.add({
            name: 'tournament-subevent-sync',
            queueName: TOURNAMENT_EVENT_QUEUE,
            data: { tournamentCode, eventCodes, includeSubComponents: true },
            opts: {
              jobId: subEventJobName,
              parent: {
                id: job.id ?? 'unknown',
                queue: job.queueQualifiedName,
              },
            },
          });

          // Wait for children to complete
          const shouldWait = await job.moveToWaitingChildren(token);
          if (shouldWait) {
            throw new WaitingChildrenError();
          }
        }
      }

      this.logger.log(`Completed tournament event sync job: ${job.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament event sync: ${errorMessage}`);
      throw error;
    }
  }

  private async processTournamentSubEventSync(job: Job, token: string): Promise<void> {
    this.logger.log(`Processing tournament sub-event sync job: ${job.id}`);
    const { tournamentCode, eventCodes, subEventCodes, includeSubComponents } = job.data;

    try {
      // Sync entries for the sub-events
      await this.syncEntries(tournamentCode, subEventCodes || eventCodes);

      // Sync draws for the sub-events
      await this.syncDraws(tournamentCode, subEventCodes || eventCodes);

      // If includeSubComponents, add draw-level sync jobs and wait for them
      if (includeSubComponents) {
        // Check if children have already been created by checking job data
        const jobData = job.data as any;
        if (jobData.childrenCreated) {
          this.logger.debug(`Job ${job.id} children already created, waiting for completion`);
          // Wait for existing children to complete
          const shouldWait = await job.moveToWaitingChildren(token);
          if (shouldWait) {
            throw new WaitingChildrenError();
          }
        } else {
          // Mark that we're creating children and create child jobs
          await job.updateData({ ...jobData, childrenCreated: true });
          
          // Create child jobs only if they don't exist
          const events = eventCodes
            ? await Promise.all(eventCodes.map((code: string) => this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
            : [await this.tournamentApiClient.getTournamentEvents(tournamentCode)];

          const flatEvents = events.flat();

          for (const event of flatEvents) {
            const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, event.Code);

            for (const draw of draws) {
              const shortId = this.generateShortId();
              const drawJobName = `draw-${tournamentCode}-${event.Code}-${draw.Code}-${shortId}`;

              this.logger.debug(`Creating draw job: ${drawJobName}`);

              await this.tournamentSyncFlow.add({
                name: 'tournament-draw-sync',
                queueName: TOURNAMENT_EVENT_QUEUE,
                data: { tournamentCode, drawCode: draw.Code, includeSubComponents: true },
                opts: {
                  jobId: drawJobName,
                  parent: {
                    id: job.id ?? 'unknown',
                    queue: job.queueQualifiedName,
                  },
                },
              });
            }
          }

          // Wait for all draw sync jobs to complete
          const shouldWait = await job.moveToWaitingChildren(token);
          if (shouldWait) {
            throw new WaitingChildrenError();
          }
        }
      }

      this.logger.log(`Completed tournament sub-event sync job: ${job.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament sub-event sync: ${errorMessage}`);
      throw error;
    }
  }

  private async processTournamentDrawSync(job: Job, token: string): Promise<void> {
    this.logger.log(`Processing tournament draw sync job: ${job.id}`);
    const { tournamentCode, drawCode, includeSubComponents } = job.data;

    try {
      // Update/create the draw record first
      await this.updateDrawFromApi(tournamentCode, drawCode);

      // If includeSubComponents, sync games and then standings
      if (includeSubComponents) {
        // Check if children have already been created by checking job data
        const jobData = job.data as any;
        if (jobData.childrenCreated) {
          this.logger.debug(`Job ${job.id} children already created, waiting for completion`);
          // Wait for existing children to complete
          const shouldWait = await job.moveToWaitingChildren(token);
          if (shouldWait) {
            throw new WaitingChildrenError();
          }
        } else {
          // Mark that we're creating children and create child jobs
          await job.updateData({ ...jobData, childrenCreated: true });
          
          // Create child jobs only if they don't exist
          const gameShortId = this.generateShortId();
          const standingShortId = this.generateShortId();
          const gameJobName = `game-${tournamentCode}-${drawCode}-${gameShortId}`;
          const standingJobName = `standing-${tournamentCode}-${drawCode}-${standingShortId}`;

          this.logger.debug(`Creating child jobs for draw ${drawCode}: ${gameJobName}, ${standingJobName}`);

          // Add games sync job with proper parent reference
          await this.tournamentSyncFlow.add({
            name: 'tournament-game-sync',
            queueName: TOURNAMENT_EVENT_QUEUE,
            data: { tournamentCode, drawCode },
            opts: {
              jobId: gameJobName,
              parent: {
                id: job.id ?? 'unknown',
                queue: job.queueQualifiedName,
              },
            },
          });

          // Add standing sync job with proper parent reference that will run after games sync
          await this.tournamentSyncFlow.add({
            name: 'tournament-standing-sync',
            queueName: TOURNAMENT_EVENT_QUEUE,
            data: { tournamentCode, drawCode },
            opts: {
              jobId: standingJobName,
              parent: {
                id: job.id ?? 'unknown',
                queue: job.queueQualifiedName,
              },
            },
          });

          // Wait for child jobs to complete
          const shouldWait = await job.moveToWaitingChildren(token);
          if (shouldWait) {
            throw new WaitingChildrenError();
          }
        }
      }

      this.logger.log(`Completed tournament draw sync job: ${job.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament draw sync: ${errorMessage}`);
      throw error;
    }
  }

  private async processTournamentGameIndividualSync(job: Job): Promise<void> {
    this.logger.log(`Processing tournament game individual sync job: ${job.id}`);
    const { tournamentCode, drawCode, matchCodes } = job.data;

    try {
      let matches: Match[] = [];

      if (matchCodes && matchCodes.length > 0) {
        // Sync specific matches
        for (const matchCode of matchCodes) {
          try {
            const match = await this.tournamentApiClient.getMatchDetails(tournamentCode, matchCode);
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

        await this.processMatch(tournamentCode, match, false); // false = isCompetition

        const progressPercentage = Math.round(((i + 1) / matches.length) * 100);
        await job.updateProgress(progressPercentage);
      }

      this.logger.log(`Completed tournament game individual sync job: ${job.id} - processed ${matches.length} matches`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament game individual sync: ${errorMessage}`);
      throw error;
    }
  }

  private async processTournamentStandingSync(job: Job): Promise<void> {
    this.logger.log(`Processing tournament standing sync job: ${job.id}`);
    const { tournamentCode, drawCode } = job.data;

    try {
      // Find the tournament event first to get proper context
      const tournamentEvent = await TournamentEventModel.findOne({
        where: { visualCode: tournamentCode },
      });

      if (!tournamentEvent) {
        this.logger.warn(`Tournament with code ${tournamentCode} not found, skipping standing sync`);
        return;
      }

      this.logger.debug(`Found tournament: ${tournamentEvent.id} with code ${tournamentCode}`);

      // Find the draw with tournament context to avoid visualCode ambiguity
      // Filter directly through the subevent-tournament relationship
      const draw = await TournamentDrawModel.findOne({
        where: {
          visualCode: drawCode,
          tournamentSubEvent: {
            tournamentEvent: {
              id: tournamentEvent.id,
            },
          },
        },
        relations: ['tournamentSubEvent', 'tournamentSubEvent.tournamentEvent'],
      });

      if (!draw) {
        this.logger.warn(`Draw with code ${drawCode} not found for tournament ${tournamentCode}, skipping standing sync`);
        return;
      }

      this.logger.debug(`Found draw: ${draw.id} with code ${drawCode}, subeventId: ${draw.subeventId}`);

      // Verify the draw belongs to the correct tournament
      if (draw.tournamentSubEvent) {
        // Load the subevent with tournament relation to check eventId
        const subEvent = await TournamentSubEvent.findOne({
          where: { id: draw.tournamentSubEvent.id },
          relations: ['tournamentEvent'],
        });

        this.logger.debug(`Found subEvent: ${subEvent?.id}, eventId: ${subEvent?.eventId}, tournament eventId: ${tournamentEvent.id}`);

        if (!subEvent || subEvent.eventId !== tournamentEvent.id) {
          // Try to repair the relationship if the sub-event exists but has wrong eventId
          if (subEvent && subEvent.eventId !== tournamentEvent.id) {
            this.logger.log(`Attempting to repair orphaned sub-event relationship for draw ${drawCode}`);
            await this.repairSubEventRelationship(subEvent, tournamentEvent);
            // Continue with standing sync after repair
          } else {
            this.logger.warn(
              `Draw ${drawCode} does not belong to tournament ${tournamentCode}. SubEvent eventId: ${subEvent?.eventId}, Tournament id: ${tournamentEvent.id}, skipping standing sync`,
            );
            return;
          }
        }
      } else {
        this.logger.warn(`Draw ${drawCode} has no tournamentSubEvent relation, skipping standing sync`);
        return;
      }

      // Calculate standings locally from games
      this.logger.debug(`Starting standings calculation for draw ${drawCode}`);
      const calculatedStandings = await this.calculateStandingsFromGames(draw);
      this.logger.debug(`Calculated ${calculatedStandings.length} standings for draw ${drawCode}`);

      if (calculatedStandings.length > 0) {
        this.logger.debug(`Updating ${calculatedStandings.length} standings in database`);
        await this.updateCalculatedStandings(draw, calculatedStandings);
        this.logger.log(`Calculated and updated ${calculatedStandings.length} standings for draw ${drawCode}`);
      } else {
        this.logger.debug(`No games found for standings calculation for draw ${drawCode}`);
      }

      this.logger.log(`Completed tournament standing sync job: ${job.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament standing sync: ${errorMessage}`);
      throw error;
    }
  }

  private async updateDrawFromApi(tournamentCode: string, drawCode: string): Promise<void> {
    try {
      const drawData = await this.tournamentApiClient.getDrawDetails?.(tournamentCode, drawCode);
      if (drawData) {
        // Find the tournament event first to get proper context
        const tournamentEvent = await TournamentEventModel.findOne({
          where: { visualCode: tournamentCode },
        });

        if (!tournamentEvent) {
          this.logger.debug(`Tournament with code ${tournamentCode} not found, skipping draw update`);
          return;
        }

        // Find the draw with tournament context to avoid visualCode ambiguity
        const existingDraw = await TournamentDrawModel.findOne({
          where: {
            visualCode: drawCode,
            tournamentSubEvent: {
              tournamentEvent: {
                id: tournamentEvent.id,
              },
            },
          },
          relations: ['tournamentSubEvent', 'tournamentSubEvent.tournamentEvent'],
        });

        if (existingDraw) {
          existingDraw.name = drawData.Name;
          existingDraw.type = this.mapDrawType(drawData.TypeID);
          existingDraw.size = drawData.Size;
          await existingDraw.save();
        }
      }
    } catch {
      this.logger.debug(`Could not update draw ${drawCode} from API`);
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

    // Get all games for this draw
    const games = await Game.find({
      where: {
        linkId: draw.id,
        linkType: 'tournament',
        status: GameStatus.NORMAL, // Only count completed games
      },
      relations: ['gamePlayerMemberships'],
    });

    this.logger.debug(`Found ${games.length} games for draw ${draw.id} with status NORMAL`);
    if (games.length === 0) {
      this.logger.debug(`No games found for draw ${draw.id}`);
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

  private async processTournamentGameSync(job: Job<GameSyncJobData>): Promise<void> {
    this.logger.log(`Processing tournament game sync job: ${job.id}`);

    try {
      const { tournamentCode, drawCode, matchCodes, date } = job.data;

      // Initialize progress
      await job.updateProgress(0);

      let matches: Match[] = [];

      if (matchCodes && matchCodes.length > 0) {
        // Sync specific matches
        for (const matchCode of matchCodes) {
          try {
            const match = await this.tournamentApiClient.getMatchDetails(tournamentCode, matchCode);
            if (match) {
              matches.push(match);
            } else {
              this.logger.warn(`Match API returned null/undefined for matchCode: ${matchCode}`);
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
      } else if (date) {
        // Sync matches by date
        const dateMatches = await this.tournamentApiClient.getMatchesByDate(tournamentCode, date);
        matches = dateMatches?.filter((match) => match != null) || [];
      } else {
        // Sync all recent matches (tournament duration + 1 day)
        const tournament = await this.tournamentApiClient.getTournamentDetails(tournamentCode);
        const startDate = new Date(tournament.StartDate);
        const endDate = new Date(tournament.EndDate);
        endDate.setDate(endDate.getDate() + 1); // Add one day buffer

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          try {
            const dayMatches = await this.tournamentApiClient.getMatchesByDate(tournamentCode, dateStr);
            const validMatches = dayMatches?.filter((match) => match != null) || [];
            matches.push(...validMatches);
          } catch {
            this.logger.debug(`No matches found for date ${dateStr}`);
          }
        }
      }

      this.logger.log(`Found ${matches.length} matches to process`);

      // Update progress after collecting all matches
      if (matches.length === 0) {
        await job.updateProgress(100);
        this.logger.log(`No matches to process for job: ${job.id}`);
        return;
      }

      // Process matches with progress tracking
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];

        if (!match) {
          this.logger.warn(`Skipping undefined match at index ${i}`);
          continue;
        }

        await this.processMatch(tournamentCode, match, false); // false = isCompetition

        // Update progress: calculate percentage completed
        const progressPercentage = Math.round(((i + 1) / matches.length) * 100);
        await job.updateProgress(progressPercentage);

        this.logger.debug(`Processed match ${i + 1}/${matches.length} (${progressPercentage}%): ${match.Code || 'NO_CODE'}`);
      }

      this.logger.log(`Completed tournament game sync job: ${job.id} - processed ${matches.length} matches`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process tournament game sync: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  private async syncEvents(tournamentCode: string, eventCodes?: string[]): Promise<void> {
    this.logger.log(`Syncing events for tournament ${tournamentCode}`);

    try {
      let events: TournamentEvent[] = [];

      if (eventCodes && eventCodes.length > 0) {
        // Sync specific events
        for (const eventCode of eventCodes) {
          const eventList = await this.tournamentApiClient.getTournamentEvents(tournamentCode, eventCode);
          events.push(...eventList);
        }
      } else {
        // Sync all events
        events = await this.tournamentApiClient.getTournamentEvents(tournamentCode);
      }

      for (const event of events) {
        await this.createOrUpdateEvent(tournamentCode, event);
      }

      this.logger.log(`Synced ${events.length} events`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync events: ${errorMessage}`);
      throw error;
    }
  }

  private async syncEntries(tournamentCode: string, eventCodes?: string[]): Promise<void> {
    this.logger.log(`Syncing entries for tournament ${tournamentCode}`);

    try {
      // Get events to sync entries for
      const events = eventCodes
        ? await Promise.all(eventCodes.map((code) => this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
        : [await this.tournamentApiClient.getTournamentEvents(tournamentCode)];

      const flatEvents = events.flat();

      for (const event of flatEvents) {
        try {
          const entries = await this.tournamentApiClient.getEventEntries(tournamentCode, event.Code);

          for (const entry of entries) {
            await this.createOrUpdateEntry(tournamentCode, event.Code, entry);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to sync entries for event ${event.Code}: ${errorMessage}`);
        }
      }

      this.logger.log(`Synced entries for ${flatEvents.length} events`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync entries: ${errorMessage}`);
      throw error;
    }
  }

  private async syncDraws(tournamentCode: string, eventCodes?: string[]): Promise<void> {
    this.logger.log(`Syncing draws for tournament ${tournamentCode}`);

    try {
      // Get events to sync draws for
      const events = eventCodes
        ? await Promise.all(eventCodes.map((code) => this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
        : [await this.tournamentApiClient.getTournamentEvents(tournamentCode)];

      const flatEvents = events.flat();

      for (const event of flatEvents) {
        try {
          const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, event.Code);

          for (const draw of draws) {
            await this.createOrUpdateDraw(tournamentCode, event.Code, draw);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to sync draws for event ${event.Code}: ${errorMessage}`);
        }
      }

      this.logger.log(`Synced draws for ${flatEvents.length} events`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync draws: ${errorMessage}`);
      throw error;
    }
  }

  private async createOrUpdateEvent(tournamentCode: string, event: TournamentEvent): Promise<void> {
    this.logger.debug(`Creating/updating tournament sub-event: ${event.Name} (${event.Code})`);

    // Find the tournament event to link the sub-event to
    const tournamentEvent = await TournamentEventModel.findOne({
      where: { visualCode: tournamentCode },
    });

    if (!tournamentEvent) {
      this.logger.warn(`Tournament with code ${tournamentCode} not found, skipping sub-event creation`);
      return;
    }

    // Check if event already exists within this specific tournament context
    const existingEvent = await TournamentSubEvent.findOne({
      where: {
        visualCode: event.Code,
        eventId: tournamentEvent.id,
      },
    });

    if (existingEvent) {
      existingEvent.name = event.Name;
      existingEvent.eventType = this.mapGenderType(event.GenderID);
      existingEvent.gameType = this.mapGameType(event.GameTypeID);
      existingEvent.level = event.LevelID;
      await existingEvent.save();
      this.logger.debug(`Updated existing sub-event ${event.Code} for tournament ${tournamentCode}`);
    } else {
      const newEvent = new TournamentSubEvent();
      newEvent.name = event.Name;
      newEvent.eventType = this.mapGenderType(event.GenderID);
      newEvent.gameType = this.mapGameType(event.GameTypeID);
      newEvent.level = event.LevelID;
      newEvent.visualCode = event.Code;
      newEvent.eventId = tournamentEvent.id; // Link to parent tournament
      await newEvent.save();
      this.logger.debug(`Created new sub-event ${event.Code} for tournament ${tournamentCode}`);
    }
  }

  private async createOrUpdateEntry(tournamentCode: string, eventCode: string, entry: Entry): Promise<void> {
    this.logger.debug(
      `Processing entry: ${entry.Player1.Firstname} ${entry.Player1.Lastname}${entry.Player2 ? ` / ${entry.Player2.Firstname} ${entry.Player2.Lastname}` : ''}`,
    );

    // Ensure players exist in our system first
    await this.createOrUpdatePlayer(entry.Player1);
    if (entry.Player2) {
      await this.createOrUpdatePlayer(entry.Player2);
    }

    // Find the players in our database
    const player1 = await Player.findOne({ where: { memberId: entry.Player1.MemberID } });
    let player2: Player | null = null;
    if (entry.Player2) {
      player2 = await Player.findOne({ where: { memberId: entry.Player2.MemberID } });
    }

    if (!player1) {
      this.logger.warn(`Player1 not found for entry: ${entry.Player1.MemberID}`);
      return;
    }

    // Find the sub-event
    const subEvent = await TournamentSubEvent.findOne({
      where: { visualCode: eventCode },
    });

    if (!subEvent) {
      this.logger.warn(`Sub-event with code ${eventCode} not found, skipping entry`);
      return;
    }

    // Get all draws for this sub-event to link entries to appropriate draws
    const draws = await TournamentDrawModel.find({
      where: { subeventId: subEvent.id },
    });

    if (draws.length === 0) {
      this.logger.warn(`No draws found for sub-event ${eventCode}, skipping entry`);
      return;
    }

    // For now, link to the first draw found (this could be improved with more specific logic)
    // In tournament structure, typically entries belong to all draws within an event
    for (const draw of draws) {
      // Check if entry already exists for this draw
      const whereCondition: any = {
        drawId: draw.id,
        player1Id: player1.id,
      };

      if (player2) {
        whereCondition.player2Id = player2.id;
      } else {
        whereCondition.player2Id = null;
      }

      const existingEntry = await EntryModel.findOne({
        where: whereCondition,
      });

      if (!existingEntry) {
        // Create new entry
        const newEntry = new EntryModel();
        newEntry.drawId = draw.id;
        newEntry.subEventId = subEvent.id;
        newEntry.player1Id = player1.id;
        newEntry.player2Id = player2?.id || undefined;
        newEntry.entryType = 'tournament';
        await newEntry.save();

        this.logger.debug(`Created entry for draw ${draw.name}`);
      }
    }
  }

  private async createOrUpdatePlayer(player: TournamentPlayer): Promise<void> {
    this.logger.debug(`Creating/updating player: ${player.Firstname} ${player.Lastname} (${player.MemberID})`);

    // Check if player already exists
    const existingPlayer = await Player.findOne({
      where: { memberId: player.MemberID },
    });

    if (existingPlayer) {
      existingPlayer.firstName = player.Firstname;
      existingPlayer.lastName = player.Lastname;
      existingPlayer.gender = this.mapGenderType(player.GenderID) === 'M' ? 'M' : this.mapGenderType(player.GenderID) === 'F' ? 'F' : 'M';
      existingPlayer.competitionPlayer = true;
      await existingPlayer.save();
    } else {
      const newPlayer = new Player();
      newPlayer.memberId = player.MemberID;
      newPlayer.firstName = player.Firstname;
      newPlayer.lastName = player.Lastname;
      newPlayer.gender = this.mapGenderType(player.GenderID) === 'M' ? 'M' : this.mapGenderType(player.GenderID) === 'F' ? 'F' : 'M';
      newPlayer.competitionPlayer = true;
      await newPlayer.save();
    }
  }

  private async createOrUpdateDraw(tournamentCode: string, eventCode: string, draw: TournamentDraw): Promise<void> {
    this.logger.debug(`Creating/updating tournament draw: ${draw.Name} (${draw.Code})`);

    // Find the sub-event that this draw belongs to
    const subEvent = await TournamentSubEvent.findOne({
      where: { visualCode: eventCode },
    });

    if (!subEvent) {
      this.logger.warn(`Sub-event with code ${eventCode} not found, skipping draw ${draw.Code}`);
      return;
    }

    // Check if draw already exists for this specific sub-event context
    const existingDraw = await TournamentDrawModel.findOne({
      where: {
        visualCode: draw.Code,
        subeventId: subEvent.id,
      },
    });

    if (existingDraw) {
      existingDraw.name = draw.Name;
      existingDraw.type = this.mapDrawType(draw.TypeID);
      existingDraw.size = draw.Size;
      await existingDraw.save();
      this.logger.debug(`Updated existing draw ${draw.Code} for sub-event ${subEvent.id}`);
    } else {
      const newDraw = new TournamentDrawModel();
      newDraw.name = draw.Name;
      newDraw.type = this.mapDrawType(draw.TypeID);
      newDraw.size = draw.Size;
      newDraw.visualCode = draw.Code;
      newDraw.subeventId = subEvent.id;
      newDraw.risers = 0;
      newDraw.fallers = 0;
      await newDraw.save();
      this.logger.debug(`Created new draw ${draw.Code} for sub-event ${subEvent.id}`);
    }
  }

  private async processMatch(tournamentCode: string, match: Match, isCompetition: boolean): Promise<void> {
    if (!match) {
      this.logger.warn('Received undefined or null match, skipping processing');
      return;
    }

    if (!match.Code) {
      this.logger.warn(`Match missing Code property, skipping: ${JSON.stringify(match)}`);
      return;
    }

    this.logger.debug(`Processing tournament match: ${match.Code} - ${match.EventName}`);

    // Check if game already exists
    const existingGame = await Game.findOne({
      where: { visualCode: match.Code },
    });

    if (existingGame) {
      existingGame.playedAt = match.MatchTime ? new Date(match.MatchTime) : undefined;
      existingGame.gameType = this.mapGameTypeToEnum(match.EventName);
      existingGame.status = this.mapMatchStatus(match.ScoreStatus.toString());
      existingGame.winner = match.Winner;
      existingGame.round = match.RoundName;

      // Set linkId to the draw ID for tournament games
      if (!isCompetition && match.DrawCode) {
        // Find the tournament event first to get proper context
        const tournamentEvent = await TournamentEventModel.findOne({
          where: { visualCode: tournamentCode },
        });

        if (tournamentEvent) {
          const draw = await TournamentDrawModel.findOne({
            where: {
              visualCode: match.DrawCode,
              tournamentSubEvent: {
                tournamentEvent: {
                  id: tournamentEvent.id,
                },
              },
            },
            relations: ['tournamentSubEvent', 'tournamentSubEvent.tournamentEvent'],
          });
          if (draw) {
            existingGame.linkId = draw.id;
          }
        }
      }

      existingGame.set1Team1 = match.Sets?.Set?.[0]?.Team1;
      existingGame.set1Team2 = match.Sets?.Set?.[0]?.Team2;
      existingGame.set2Team1 = match.Sets?.Set?.[1]?.Team1;
      existingGame.set2Team2 = match.Sets?.Set?.[1]?.Team2;
      existingGame.set3Team1 = match.Sets?.Set?.[2]?.Team1;
      existingGame.set3Team2 = match.Sets?.Set?.[2]?.Team2;
      await existingGame.save();
    } else {
      const newGame = new Game();
      newGame.playedAt = match.MatchTime ? new Date(match.MatchTime) : undefined;
      newGame.gameType = this.mapGameTypeToEnum(match.EventName);
      newGame.status = this.mapMatchStatus(match.ScoreStatus.toString());
      newGame.winner = match.Winner;
      newGame.round = match.RoundName;
      newGame.linkType = isCompetition ? 'competition' : 'tournament';
      newGame.visualCode = match.Code;

      // Set linkId to the draw ID for tournament games
      if (!isCompetition && match.DrawCode) {
        // Find the tournament event first to get proper context
        const tournamentEvent = await TournamentEventModel.findOne({
          where: { visualCode: tournamentCode },
        });

        if (tournamentEvent) {
          const draw = await TournamentDrawModel.findOne({
            where: {
              visualCode: match.DrawCode,
              tournamentSubEvent: {
                tournamentEvent: {
                  id: tournamentEvent.id,
                },
              },
            },
            relations: ['tournamentSubEvent', 'tournamentSubEvent.tournamentEvent'],
          });
          if (draw) {
            newGame.linkId = draw.id;
          }
        }
      }
      newGame.set1Team1 = match.Sets?.Set?.[0]?.Team1;
      newGame.set1Team2 = match.Sets?.Set?.[0]?.Team2;
      newGame.set2Team1 = match.Sets?.Set?.[1]?.Team1;
      newGame.set2Team2 = match.Sets?.Set?.[1]?.Team2;
      newGame.set3Team1 = match.Sets?.Set?.[2]?.Team1;
      newGame.set3Team2 = match.Sets?.Set?.[2]?.Team2;
      await newGame.save();
    }

    // Ensure players exist in our system
    if (match.Team1?.Player1) {
      await this.createOrUpdatePlayer(match.Team1.Player1);
    }
    if (match.Team1?.Player2) {
      await this.createOrUpdatePlayer(match.Team1.Player2);
    }
    if (match.Team2?.Player1) {
      await this.createOrUpdatePlayer(match.Team2.Player1);
    }
    if (match.Team2?.Player2) {
      await this.createOrUpdatePlayer(match.Team2.Player2);
    }

    // Create entries for tournament matches to link players to draws
    if (!isCompetition && match.DrawCode && match.EventCode) {
      await this.createEntriesFromMatch(tournamentCode, match);
    }
  }

  private async createEntriesFromMatch(tournamentCode: string, match: Match): Promise<void> {
    this.logger.debug(`Creating entries from match: ${match.Code} - ${match.EventName}`);

    if (!match.DrawCode) {
      this.logger.warn(`Match ${match.Code} has no draw code, skipping entry creation`);
      return;
    }

    if (!match.EventCode) {
      this.logger.warn(`Match ${match.Code} has no event code, skipping entry creation`);
      return;
    }

    // Find the sub-event within the correct tournament context
    // First find the tournament event by its visual code
    const tournamentEvent = await TournamentEventModel.findOne({
      where: { visualCode: tournamentCode },
    });

    if (!tournamentEvent) {
      this.logger.warn(`Tournament event with code ${tournamentCode} not found, skipping entry creation`);
      return;
    }

    // Find the sub-event within this tournament
    const subEvent = await TournamentSubEvent.findOne({
      where: {
        visualCode: match.EventCode,
        eventId: tournamentEvent.id,
      },
    });

    if (!subEvent) {
      this.logger.warn(`Sub-event with code ${match.EventCode} not found in tournament ${tournamentCode}, skipping entry creation`);
      return;
    }

    // Find the draw within the correct sub-event context
    const draw = await TournamentDrawModel.findOne({
      where: {
        visualCode: match.DrawCode,
        subeventId: subEvent.id,
      },
    });

    if (!draw) {
      this.logger.warn(
        `Draw with code ${match.DrawCode} not found in tournament ${tournamentCode} event ${match.EventCode}, skipping entry creation`,
      );
      return;
    }

    // Create entries for Team1
    if (match.Team1?.Player1) {
      try {
        await this.createEntryFromPlayers(match.Team1.Player1, match.Team1.Player2 || null, draw, subEvent);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to create entry for Team1 from match ${match.Code}: ${errorMessage}`);
      }
    }

    // Create entries for Team2 (avoid duplicates if same players)
    if (match.Team2?.Player1) {
      try {
        await this.createEntryFromPlayers(match.Team2.Player1, match.Team2.Player2 || null, draw, subEvent);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to create entry for Team2 from match ${match.Code}: ${errorMessage}`);
      }
    }
  }

  private async createEntryFromPlayers(
    player1: TournamentPlayer,
    player2: TournamentPlayer | null,
    draw: TournamentDrawModel,
    subEvent: TournamentSubEvent,
  ): Promise<void> {
    // Find the players in our database
    const dbPlayer1 = await Player.findOne({ where: { memberId: player1.MemberID } });
    let dbPlayer2: Player | null = null;
    if (player2) {
      dbPlayer2 = await Player.findOne({ where: { memberId: player2.MemberID } });
    }

    if (!dbPlayer1) {
      this.logger.warn(`Player1 not found for entry: ${player1.MemberID} (${player1.Firstname} ${player1.Lastname})`);
      return;
    }

    if (player2 && !dbPlayer2) {
      this.logger.warn(`Player2 not found for entry: ${player2.MemberID} (${player2.Firstname} ${player2.Lastname})`);
      return;
    }

    // Check if entry already exists
    const whereCondition: any = {
      drawId: draw.id,
      player1Id: dbPlayer1.id,
    };

    if (dbPlayer2) {
      whereCondition.player2Id = dbPlayer2.id;
    } else {
      whereCondition.player2Id = null;
    }

    const existingEntry = await EntryModel.findOne({
      where: whereCondition,
    });

    if (!existingEntry) {
      // Create new entry
      const newEntry = new EntryModel();
      newEntry.drawId = draw.id;
      newEntry.subEventId = subEvent.id;
      newEntry.player1Id = dbPlayer1.id;
      newEntry.player2Id = dbPlayer2?.id || undefined;
      newEntry.entryType = 'tournament';
      await newEntry.save();

      this.logger.debug(
        `Created entry for draw ${draw.name} - players: ${player1.Firstname} ${player1.Lastname}${player2 ? ` / ${player2.Firstname} ${player2.Lastname}` : ''}`,
      );
    } else {
      this.logger.debug(
        `Entry already exists for draw ${draw.name} - players: ${player1.Firstname} ${player1.Lastname}${player2 ? ` / ${player2.Firstname} ${player2.Lastname}` : ''}`,
      );
    }
  }

  // Helper methods for mapping
  private mapGenderType(genderId: number): string {
    switch (genderId) {
      case 1:
        return 'M';
      case 2:
        return 'F';
      case 3:
        return 'MX';
      default:
        return 'M';
    }
  }

  private mapGameType(gameTypeId: number): string {
    switch (gameTypeId) {
      case 1:
        return 'S';
      case 2:
        return 'D';
      default:
        return 'S';
    }
  }

  private mapDrawType(drawTypeId: number): string {
    switch (drawTypeId) {
      case 0:
        return 'KO'; // Knockout elimination
      case 1:
        return 'QUALIFICATION'; // Qualification rounds
      case 2:
        return 'QUALIFICATION'; // Pre-qualification
      case 3:
        return 'POULE'; // Round-robin groups
      case 4:
        return 'KO'; // Playoff/championship
      case 5:
        return 'QUALIFICATION'; // Qualifying tournament
      default:
        return 'KO'; // Default to knockout
    }
  }

  private mapGameTypeToEnum(eventName: string): GameType {
    if (eventName?.toLowerCase().includes('single')) return GameType.S;
    if (eventName?.toLowerCase().includes('double')) return GameType.D;
    if (eventName?.toLowerCase().includes('mixed')) return GameType.MX;
    return GameType.S; // Default to singles
  }

  private mapMatchStatus(scoreStatus: string): GameStatus {
    switch (scoreStatus?.toLowerCase()) {
      case 'played':
        return GameStatus.NORMAL;
      case 'scheduled':
        return GameStatus.NORMAL;
      case 'postponed':
        return GameStatus.NORMAL;
      case 'cancelled':
        return GameStatus.NO_MATCH;
      default:
        return GameStatus.NORMAL;
    }
  }

  private async repairSubEventRelationship(subEvent: TournamentSubEvent, tournamentEvent: TournamentEventModel): Promise<void> {
    try {
      this.logger.log(
        `Repairing sub-event ${subEvent.id} (${subEvent.visualCode}) to link to tournament ${tournamentEvent.id} (${tournamentEvent.visualCode})`,
      );

      subEvent.eventId = tournamentEvent.id;
      await subEvent.save();

      this.logger.log(`Successfully repaired sub-event relationship`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to repair sub-event relationship: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Generate a short, unique identifier for job names
   * Uses current timestamp and random component to ensure uniqueness
   */
  private generateShortId(): string {
    const timestamp = Date.now().toString(36); // Base36 timestamp (shorter)
    const random = Math.random().toString(36).substring(2, 8); // 6 random chars
    return `${timestamp}-${random}`;
  }
}
