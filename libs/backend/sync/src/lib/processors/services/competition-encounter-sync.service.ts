import { TournamentApiClient, TeamMatch, Match, Player as TournamentPlayer } from '@app/backend-tournament-api';
import { CompetitionDraw, CompetitionEncounter, Team as TeamModel, Game, Player, GamePlayerMembership, RankingSystem, RankingPlace } from '@app/models';
import { GameStatus, GameType } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TeamMatchingService } from './team-matching.service';
import { LessThanOrEqual } from 'typeorm';

/**
 * Encounter sync can be triggered in two ways:
 * 1. Manual: by encounterId (item must exist)
 * 2. Parent job: by tournamentCode + drawId + encounterCode (item might not exist yet)
 */
export type CompetitionEncounterSyncData =
  | { encounterId: string } // Manual trigger
  | { tournamentCode: string; drawId: string; encounterCode: string }; // Parent job trigger

@Injectable()
export class CompetitionEncounterSyncService {
  private readonly logger = new Logger(CompetitionEncounterSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly teamMatchingService: TeamMatchingService,
  ) {}

  async processEncounterSync(
    job: Job<CompetitionEncounterSyncData>,
    updateProgress: (progress: number) => Promise<void>,
    token: string,
  ): Promise<void> {
    try {
      await updateProgress(10);

      // Resolve context from either input type
      const context = await this.resolveEncounterContext(job.data);
      this.logger.log(`Processing encounter ${context.encounterCode} for draw ${context.draw.id}`);

      await this.processEncounter(context);

      await updateProgress(100);
      this.logger.log(`Completed encounter ${context.encounterCode}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process encounter: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  /**
   * Resolve encounter context from either:
   * 1. Internal ID (manual trigger) - encounter must exist
   * 2. Parent context (parent job trigger) - encounter might not exist yet
   */
  private async resolveEncounterContext(
    data: CompetitionEncounterSyncData,
  ): Promise<{ tournamentCode: string; draw: CompetitionDraw; encounterCode: string }> {
    if ('encounterId' in data) {
      return this.resolveFromInternalId(data.encounterId);
    } else {
      return this.resolveFromParentContext(data.tournamentCode, data.drawId, data.encounterCode);
    }
  }

  /**
   * Load encounter context by internal ID (manual trigger)
   * The encounter must exist in the database
   */
  private async resolveFromInternalId(
    encounterId: string,
  ): Promise<{ tournamentCode: string; draw: CompetitionDraw; encounterCode: string }> {
    const encounter = await CompetitionEncounter.findOne({
      where: { id: encounterId },
      relations: ['drawCompetition', 'drawCompetition.competitionSubEvent', 'drawCompetition.competitionSubEvent.competitionEvent'],
    });

    if (!encounter) {
      throw new Error(`Encounter with id ${encounterId} not found`);
    }

    const draw = encounter.drawCompetition;
    const event = draw?.competitionSubEvent?.competitionEvent;

    if (!draw || !event) {
      throw new Error(`Encounter ${encounterId} is missing required relations`);
    }

    const tournamentCode = event.visualCode;
    if (!tournamentCode || !encounter.visualCode) {
      throw new Error(`Encounter ${encounterId} or its event is missing visual code`);
    }

    return { tournamentCode, draw, encounterCode: encounter.visualCode };
  }

  /**
   * Load encounter context from parent job data
   * The encounter might not exist yet - we have the codes to fetch from API
   */
  private async resolveFromParentContext(
    tournamentCode: string,
    drawId: string,
    encounterCode: string,
  ): Promise<{ tournamentCode: string; draw: CompetitionDraw; encounterCode: string }> {
    const draw = await CompetitionDraw.findOne({
      where: { id: drawId },
      relations: ['competitionSubEvent', 'competitionSubEvent.competitionEvent'],
    });

    if (!draw) {
      throw new Error(`Competition draw with id ${drawId} not found`);
    }

    return { tournamentCode, draw, encounterCode };
  }

  /**
   * Process the encounter using resolved context
   */
  private async processEncounter(context: { tournamentCode: string; draw: CompetitionDraw; encounterCode: string }): Promise<void> {
    const { tournamentCode, draw, encounterCode } = context;
    const drawCode = draw.visualCode;

    if (!drawCode) {
      throw new Error(`Draw ${draw.id} has no visual code`);
    }

    // Fetch all team matches for the draw
    const drawTeamMatches = await this.tournamentApiClient.getEncountersByDraw(tournamentCode, drawCode);
    const teamMatch = drawTeamMatches?.find((match) => match?.Code === encounterCode);

    if (!teamMatch) {
      this.logger.warn(`Encounter ${encounterCode} not found in draw ${drawCode}`);
      return;
    }

    await this.createOrUpdateEncounter(tournamentCode, teamMatch, draw);
  }

  private async createOrUpdateEncounter(tournamentCode: string, teamMatch: TeamMatch, draw: CompetitionDraw): Promise<void> {
    this.logger.debug(`Processing encounter: ${teamMatch.Code}`);

    // Get competition event for team matching context
    const competitionEvent = draw.competitionSubEvent?.competitionEvent || null;

    // Find teams using flexible matching (Team1 = Home, Team2 = Away)
    let homeTeam: TeamModel | null = null;
    let awayTeam: TeamModel | null = null;

    if (teamMatch.Team1) {
      const result = await this.teamMatchingService.findTeam(teamMatch.Team1.Code, teamMatch.Team1.Name, competitionEvent);
      homeTeam = result.team;
      if (result.team) {
        this.logger.debug(`Home team matched: "${teamMatch.Team1.Name}" -> "${result.team.name}" (${result.confidence})`);
      }
    }
    if (teamMatch.Team2) {
      const result = await this.teamMatchingService.findTeam(teamMatch.Team2.Code, teamMatch.Team2.Name, competitionEvent);
      awayTeam = result.team;
      if (result.team) {
        this.logger.debug(`Away team matched: "${teamMatch.Team2.Name}" -> "${result.team.name}" (${result.confidence})`);
      }
    }

    // Calculate scores from Sets if available (sum of set scores)
    // Note: getEncountersByDraw returns a single MatchSet, not an array
    let homeScore: number | undefined;
    let awayScore: number | undefined;
    if (teamMatch.Sets?.Set) {
      const sets = Array.isArray(teamMatch.Sets.Set) ? teamMatch.Sets.Set : [teamMatch.Sets.Set];
      homeScore = sets.reduce((sum, set) => sum + (parseInt(set.Team1 || '0', 10)), 0);
      awayScore = sets.reduce((sum, set) => sum + (parseInt(set.Team2 || '0', 10)), 0);
    }

    const existingEncounter = await CompetitionEncounter.findOne({
      where: {
        visualCode: teamMatch.Code,
        drawCompetition: {
          competitionSubEvent: {
            competitionEvent: {
              visualCode: tournamentCode,
            },
          },
        },
      },
      relations: ['drawCompetition', 'drawCompetition.competitionSubEvent', 'drawCompetition.competitionSubEvent.competitionEvent'],
    });

    let encounter: CompetitionEncounter;
    if (existingEncounter) {
      existingEncounter.date = teamMatch.MatchTime ? new Date(teamMatch.MatchTime) : undefined;
      existingEncounter.drawId = draw.id;
      existingEncounter.homeTeamId = homeTeam?.id;
      existingEncounter.awayTeamId = awayTeam?.id;
      existingEncounter.homeScore = homeScore;
      existingEncounter.awayScore = awayScore;
      await existingEncounter.save();
      encounter = existingEncounter;
    } else {
      const newEncounter = new CompetitionEncounter();
      newEncounter.visualCode = teamMatch.Code;
      newEncounter.date = teamMatch.MatchTime ? new Date(teamMatch.MatchTime) : undefined;
      newEncounter.drawId = draw.id;
      newEncounter.homeTeamId = homeTeam?.id;
      newEncounter.awayTeamId = awayTeam?.id;
      newEncounter.homeScore = homeScore;
      newEncounter.awayScore = awayScore;
      await newEncounter.save();
      encounter = newEncounter;
    }

    // Fetch and process all individual games within this encounter
    // This is more efficient than separate game sync (1 API call instead of 8)
    const encounterDate = teamMatch.MatchTime ? new Date(teamMatch.MatchTime) : undefined;
    await this.syncGamesForEncounter(tournamentCode, teamMatch.Code, encounter.id, encounterDate);
  }

  /**
   * Fetch all individual games within an encounter and sync them
   */
  private async syncGamesForEncounter(tournamentCode: string, encounterCode: string, encounterId: string, encounterDate?: Date): Promise<void> {
    try {
      const games = await this.tournamentApiClient.getTeamMatchGames(tournamentCode, encounterCode);
      this.logger.debug(`Found ${games.length} games for encounter ${encounterCode}`);

      for (const game of games) {
        if (!game) continue;
        await this.processGame(game, encounterId, encounterDate);
      }

      this.logger.debug(`Processed ${games.length} games for encounter ${encounterCode}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to sync games for encounter ${encounterCode}: ${errorMessage}`);
      // Don't throw - we still want the encounter to be saved even if games fail
    }
  }

  /**
   * Process an individual game (match) within an encounter
   */
  private async processGame(match: Match, encounterId: string, encounterDate?: Date): Promise<void> {
    this.logger.debug(`Processing game: ${match.Code}`);

    // Check if game already exists - use linkId (encounterId) to ensure we find the correct game
    // since visualCode is not unique across encounters (it's just 1, 2, 3, etc.)
    const existingGame = await Game.findOne({
      where: { visualCode: match.Code, linkId: encounterId, linkType: 'competition' },
    });

    if (existingGame) {
    existingGame.playedAt = encounterDate;
      existingGame.gameType = this.mapGameType(match);
      existingGame.status = this.mapMatchStatus(match.ScoreStatus?.toString());
      existingGame.winner = match.Winner;
      existingGame.round = match.RoundName;
      existingGame.linkId = encounterId;
      existingGame.set1Team1 = parseInt(match.Sets?.Set?.[0]?.Team1 || '0', 10);
      existingGame.set1Team2 = parseInt(match.Sets?.Set?.[0]?.Team2 || '0', 10);
      existingGame.set2Team1 = parseInt(match.Sets?.Set?.[1]?.Team1 || '0', 10);
      existingGame.set2Team2 = parseInt(match.Sets?.Set?.[1]?.Team2 || '0', 10);
      existingGame.set3Team1 = parseInt(match.Sets?.Set?.[2]?.Team1 || '0', 10);
      existingGame.set3Team2 = parseInt(match.Sets?.Set?.[2]?.Team2 || '0', 10);
      await existingGame.save();
    } else {
      const newGame = new Game();
      newGame.visualCode = match.Code;
      newGame.playedAt = encounterDate;
      newGame.gameType = this.mapGameType(match);
      newGame.status = this.mapMatchStatus(match.ScoreStatus?.toString());
      newGame.winner = match.Winner;
      newGame.round = match.RoundName;
      newGame.linkType = 'competition';
      newGame.linkId = encounterId;
      newGame.set1Team1 = parseInt(match.Sets?.Set?.[0]?.Team1 || '0', 10);
      newGame.set1Team2 = parseInt(match.Sets?.Set?.[0]?.Team2 || '0', 10);
      newGame.set2Team1 = parseInt(match.Sets?.Set?.[1]?.Team1 || '0', 10);
      newGame.set2Team2 = parseInt(match.Sets?.Set?.[1]?.Team2 || '0', 10);
      newGame.set3Team1 = parseInt(match.Sets?.Set?.[2]?.Team1 || '0', 10);
      newGame.set3Team2 = parseInt(match.Sets?.Set?.[2]?.Team2 || '0', 10);
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

    // Create game player memberships
    const game =
      existingGame ||
      (await Game.findOne({
        where: { visualCode: match.Code, linkId: encounterId, linkType: 'competition' },
      }));

    if (game) {
      await this.createGamePlayerMemberships(game, match);
    }
  }

  /**
   * Map match to game type based on MatchTypeID
   * MatchTypeID: 1 = Singles, 3 = Doubles
   */
  private mapGameType(match: Match & { MatchTypeID?: number }): GameType {
    const matchTypeId = (match as { MatchTypeID?: number }).MatchTypeID;
    if (matchTypeId === 1) return GameType.S;
    if (matchTypeId === 3) return GameType.D;
    // Fallback to checking event name
    if (match.EventName?.toLowerCase().includes('single')) return GameType.S;
    if (match.EventName?.toLowerCase().includes('double')) return GameType.D;
    if (match.EventName?.toLowerCase().includes('mixed')) return GameType.MX;
    return GameType.S; // Default to singles
  }

  private mapMatchStatus(scoreStatus?: string): GameStatus {
    switch (scoreStatus?.toLowerCase()) {
      case 'played':
      case '0': // ScoreStatus 0 typically means played
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

  private async createOrUpdatePlayer(player: TournamentPlayer): Promise<void> {
    if (!player?.MemberID) return;

    const existingPlayer = await Player.findOne({
      where: { memberId: player.MemberID },
    });

    if (existingPlayer) {
      existingPlayer.firstName = player.Firstname;
      existingPlayer.lastName = player.Lastname;
      existingPlayer.gender = player.GenderID === 1 ? 'M' : player.GenderID === 2 ? 'F' : 'M';
      existingPlayer.competitionPlayer = true;
      await existingPlayer.save();
    } else {
      const newPlayer = new Player();
      newPlayer.memberId = player.MemberID;
      newPlayer.firstName = player.Firstname;
      newPlayer.lastName = player.Lastname;
      newPlayer.gender = player.GenderID === 1 ? 'M' : player.GenderID === 2 ? 'F' : 'M';
      newPlayer.competitionPlayer = true;
      await newPlayer.save();
    }
  }

  private async createGamePlayerMemberships(game: Game, match: Match): Promise<void> {
    const createMembershipForPlayer = async (tournamentPlayer: TournamentPlayer, team: number, playerPosition: number): Promise<void> => {
      if (!tournamentPlayer?.MemberID) return;

      const primarySystem = await RankingSystem.findOne({ where: { primary: true } });

      const player = await Player.findOne({
        where: { memberId: tournamentPlayer.MemberID },
      });

      if (!player) {
        this.logger.warn(`Player not found for memberID: ${tournamentPlayer.MemberID}`);
        return;
      }

      const rankingplace = await RankingPlace.findOne({
        where: {
          playerId: player.id,
          rankingDate: LessThanOrEqual(game.playedAt || new Date()),
          systemId: primarySystem!.id,
        },
        order: {
          rankingDate: 'DESC',
        },
      });

      const existingMembership = await GamePlayerMembership.findOne({
        where: {
          gameId: game.id,
          playerId: player.id,
        },
      });

      if (existingMembership) {
        existingMembership.team = team;
        existingMembership.player = playerPosition;
        existingMembership.single = rankingplace ? rankingplace.single : primarySystem!.amountOfLevels;
        existingMembership.double = rankingplace ? rankingplace.double : primarySystem!.amountOfLevels;
        existingMembership.mix = rankingplace ? rankingplace.mix : primarySystem!.amountOfLevels;
        await existingMembership.save();
      } else {
        const membership = new GamePlayerMembership();
        membership.gameId = game.id;
        membership.playerId = player.id;
        membership.team = team;
        membership.player = playerPosition;
        membership.single = rankingplace ? rankingplace.single : primarySystem!.amountOfLevels;
        membership.double = rankingplace ? rankingplace.double : primarySystem!.amountOfLevels;
        membership.mix = rankingplace ? rankingplace.mix : primarySystem!.amountOfLevels;
        await membership.save();
      }
    };

    if (match.Team1?.Player1) {
      await createMembershipForPlayer(match.Team1.Player1, 1, 1);
    }
    if (match.Team1?.Player2) {
      await createMembershipForPlayer(match.Team1.Player2, 1, 2);
    }
    if (match.Team2?.Player1) {
      await createMembershipForPlayer(match.Team2.Player1, 2, 1);
    }
    if (match.Team2?.Player2) {
      await createMembershipForPlayer(match.Team2.Player2, 2, 2);
    }
  }
}
