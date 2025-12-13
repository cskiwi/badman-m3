import { PermGuard, User } from '@app/backend-authorization';
import {
  Game,
  Court,
  TournamentScheduleSlot,
  Player,
} from '@app/models';
import { ScheduleSlotStatus } from '@app/models-enum';
import { TournamentLiveGateway } from '@app/backend-sync';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  NotFoundException,
  Optional,
  UseGuards,
} from '@nestjs/common';
import {
  Args,
  ID,
  Int,
  Mutation,
  ObjectType,
  Field,
  Query,
  Resolver,
} from '@nestjs/graphql';
import {
  StartGameInput,
  GameUpdateInput,
  AssignNextGameInput,
} from '../../../inputs';
import { In, IsNull, Not } from 'typeorm';

// Result types
@ObjectType('CourtStatus')
class CourtStatus {
  @Field(() => ID)
  courtId!: string;

  @Field(() => String)
  courtName!: string;

  @Field(() => Game, { nullable: true })
  currentGame?: Game;

  @Field(() => Game, { nullable: true })
  nextGame?: Game;

  @Field(() => String)
  status!: 'available' | 'in_progress' | 'blocked';
}

@ObjectType('TournamentCourtOverview')
class TournamentCourtOverview {
  @Field(() => [CourtStatus])
  courts!: CourtStatus[];

  @Field(() => Int)
  gamesInProgress!: number;

  @Field(() => Int)
  gamesCompleted!: number;

  @Field(() => Int)
  gamesRemaining!: number;
}

@ObjectType('RecentGameResult')
class RecentGameResult {
  @Field(() => Game)
  game!: Game;

  @Field(() => Date)
  completedAt!: Date;

  @Field(() => String)
  score!: string;
}

@Resolver()
export class TournamentCourtResolver {
  constructor(
    @Optional() @Inject(TournamentLiveGateway) private readonly liveGateway?: TournamentLiveGateway,
  ) {}

  // ============ QUERIES ============

  @Query(() => TournamentCourtOverview, { description: 'Get overview of all courts for a tournament' })
  async tournamentCourtOverview(
    @Args('tournamentEventId', { type: () => ID }) tournamentEventId: string,
  ): Promise<TournamentCourtOverview> {
    // Get all schedule slots for this tournament
    const slots = await TournamentScheduleSlot.find({
      where: { tournamentEventId },
    });

    // Get unique court IDs
    const courtIds = [...new Set(slots.map((s) => s.courtId))];
    const courts: CourtStatus[] = [];

    for (const courtId of courtIds) {
      const court = await Court.findOne({ where: { id: courtId } });
      if (!court) continue;

      // Find current game (in progress)
      const inProgressSlot = await TournamentScheduleSlot.findOne({
        where: {
          tournamentEventId,
          courtId,
          status: ScheduleSlotStatus.IN_PROGRESS,
          gameId: Not(IsNull()),
        },
      });

      let currentGame: Game | undefined;
      if (inProgressSlot?.gameId) {
        currentGame = (await Game.findOne({ where: { id: inProgressSlot.gameId } })) ?? undefined;
      }

      // Find next scheduled game
      const nextSlot = await TournamentScheduleSlot.findOne({
        where: {
          tournamentEventId,
          courtId,
          status: ScheduleSlotStatus.SCHEDULED,
          gameId: Not(IsNull()),
        },
        order: { startTime: 'ASC' },
      });

      let nextGame: Game | undefined;
      if (nextSlot?.gameId) {
        nextGame = (await Game.findOne({ where: { id: nextSlot.gameId } })) ?? undefined;
      }

      // Determine status
      let status: 'available' | 'in_progress' | 'blocked' = 'available';
      if (currentGame) {
        status = 'in_progress';
      } else {
        // Check if any slots are blocked
        const blockedSlot = await TournamentScheduleSlot.findOne({
          where: {
            tournamentEventId,
            courtId,
            status: ScheduleSlotStatus.BLOCKED,
          },
        });
        if (blockedSlot) {
          status = 'blocked';
        }
      }

      courts.push({
        courtId,
        courtName: court.name ?? `Court ${courtId.slice(0, 8)}`,
        currentGame,
        nextGame,
        status,
      });
    }

    // Count games
    const gamesInProgress = await TournamentScheduleSlot.count({
      where: {
        tournamentEventId,
        status: ScheduleSlotStatus.IN_PROGRESS,
      },
    });

    const gamesCompleted = await TournamentScheduleSlot.count({
      where: {
        tournamentEventId,
        status: ScheduleSlotStatus.COMPLETED,
      },
    });

    const gamesRemaining = await TournamentScheduleSlot.count({
      where: {
        tournamentEventId,
        status: In([ScheduleSlotStatus.SCHEDULED, ScheduleSlotStatus.AVAILABLE]),
        gameId: Not(IsNull()),
      },
    });

    return {
      courts,
      gamesInProgress,
      gamesCompleted,
      gamesRemaining,
    };
  }

  @Query(() => [RecentGameResult], { description: 'Get recently completed games' })
  async recentGameResults(
    @Args('tournamentEventId', { type: () => ID }) tournamentEventId: string,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<RecentGameResult[]> {
    // Find completed slots
    const completedSlots = await TournamentScheduleSlot.find({
      where: {
        tournamentEventId,
        status: ScheduleSlotStatus.COMPLETED,
        gameId: Not(IsNull()),
      },
      order: { updatedAt: 'DESC' },
      take: limit,
    });

    const results: RecentGameResult[] = [];

    for (const slot of completedSlots) {
      if (!slot.gameId) continue;

      const game = await Game.findOne({ where: { id: slot.gameId } });
      if (!game) continue;

      results.push({
        game,
        completedAt: game.actualEndTime ?? slot.updatedAt,
        score: this.formatGameScore(game),
      });
    }

    return results;
  }

  @Query(() => [Game], { description: 'Get upcoming scheduled games' })
  async upcomingGames(
    @Args('tournamentEventId', { type: () => ID }) tournamentEventId: string,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<Game[]> {
    const scheduledSlots = await TournamentScheduleSlot.find({
      where: {
        tournamentEventId,
        status: ScheduleSlotStatus.SCHEDULED,
        gameId: Not(IsNull()),
      },
      order: { startTime: 'ASC' },
      take: limit,
    });

    const games: Game[] = [];

    for (const slot of scheduledSlots) {
      if (!slot.gameId) continue;
      const game = await Game.findOne({ where: { id: slot.gameId } });
      if (game) {
        games.push(game);
      }
    }

    return games;
  }

  @Query(() => [Game], { description: 'Get currently playing games' })
  async nowPlayingGames(
    @Args('tournamentEventId', { type: () => ID }) tournamentEventId: string,
  ): Promise<Game[]> {
    const inProgressSlots = await TournamentScheduleSlot.find({
      where: {
        tournamentEventId,
        status: ScheduleSlotStatus.IN_PROGRESS,
        gameId: Not(IsNull()),
      },
    });

    const games: Game[] = [];

    for (const slot of inProgressSlots) {
      if (!slot.gameId) continue;
      const game = await Game.findOne({ where: { id: slot.gameId } });
      if (game) {
        games.push(game);
      }
    }

    return games;
  }

  // ============ MUTATIONS ============

  @Mutation(() => Game, { description: 'Start a game' })
  @UseGuards(PermGuard)
  async startGame(
    @User() user: Player,
    @Args('input') input: StartGameInput,
  ): Promise<Game> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to start games');
    }

    const game = await Game.findOne({
      where: { id: input.gameId },
    });

    if (!game) {
      throw new NotFoundException(`Game with ID ${input.gameId} not found`);
    }

    // Check if game has already been completed (has playedAt set)
    if (game.playedAt) {
      throw new BadRequestException('Game has already been played');
    }

    // Check if game is already in progress (has actualStartTime but no playedAt)
    if (game.actualStartTime && !game.playedAt) {
      throw new BadRequestException('Game is already in progress');
    }

    // Update court if provided
    if (input.courtId) {
      game.courtId = input.courtId;
    }

    // Mark game as started
    game.actualStartTime = new Date();
    await game.save();

    // Update schedule slot if exists
    let tournamentEventId: string | undefined;
    if (game.scheduleSlotId) {
      const slot = await TournamentScheduleSlot.findOne({
        where: { id: game.scheduleSlotId },
      });

      if (slot) {
        slot.status = ScheduleSlotStatus.IN_PROGRESS;
        await slot.save();
        tournamentEventId = slot.tournamentEventId;
      }
    }

    // Emit WebSocket event
    if (this.liveGateway && tournamentEventId) {
      this.liveGateway.emitGameStarted(tournamentEventId, {
        gameId: game.id,
        courtId: game.courtId,
        status: 'in_progress',
        startTime: game.actualStartTime,
      });

      // Also emit court status update
      if (game.courtId) {
        const court = await Court.findOne({ where: { id: game.courtId } });
        this.liveGateway.emitCourtStatusUpdate(tournamentEventId, {
          courtId: game.courtId,
          courtName: court?.name ?? `Court ${game.courtId.slice(0, 8)}`,
          status: 'in_progress',
          currentGameId: game.id,
        });
      }
    }

    return game;
  }

  @Mutation(() => Game, { description: 'Update a game (scores, court, winner)' })
  @UseGuards(PermGuard)
  async updateGame(
    @User() user: Player,
    @Args('gameId', { type: () => ID }) gameId: string,
    @Args('input') input: GameUpdateInput,
  ): Promise<Game> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to update games');
    }

    const game = await Game.findOne({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    // If setting winner on a game that's already completed, throw error
    if (input.winner !== undefined && game.playedAt) {
      throw new BadRequestException('Game has already been completed');
    }

    // Validate winner if provided
    if (input.winner !== undefined && input.winner !== 1 && input.winner !== 2) {
      throw new BadRequestException('Winner must be 1 or 2');
    }

    // Update fields from input
    if (input.set1Team1 !== undefined) game.set1Team1 = input.set1Team1;
    if (input.set1Team2 !== undefined) game.set1Team2 = input.set1Team2;
    if (input.set2Team1 !== undefined) game.set2Team1 = input.set2Team1;
    if (input.set2Team2 !== undefined) game.set2Team2 = input.set2Team2;
    if (input.set3Team1 !== undefined) game.set3Team1 = input.set3Team1;
    if (input.set3Team2 !== undefined) game.set3Team2 = input.set3Team2;
    if (input.courtId !== undefined) game.courtId = input.courtId;

    // If winner is set, mark game as completed
    const isCompleting = input.winner !== undefined && !game.playedAt;
    if (isCompleting) {
      game.winner = input.winner;
      game.playedAt = new Date();
      game.actualEndTime = new Date();
    }

    await game.save();

    // Update schedule slot if completing
    let tournamentEventId: string | undefined;
    if (isCompleting && game.scheduleSlotId) {
      const slot = await TournamentScheduleSlot.findOne({
        where: { id: game.scheduleSlotId },
      });

      if (slot) {
        slot.status = ScheduleSlotStatus.COMPLETED;
        await slot.save();
        tournamentEventId = slot.tournamentEventId;
      }
    }

    // Emit WebSocket events
    if (this.liveGateway && game.scheduleSlotId) {
      const slot = await TournamentScheduleSlot.findOne({
        where: { id: game.scheduleSlotId },
      });

      if (slot?.tournamentEventId) {
        tournamentEventId = slot.tournamentEventId;

        if (isCompleting) {
          // Game completed
          this.liveGateway.emitGameCompleted(tournamentEventId, {
            gameId: game.id,
            courtId: game.courtId,
            status: 'completed',
            set1Team1: game.set1Team1,
            set1Team2: game.set1Team2,
            set2Team1: game.set2Team1,
            set2Team2: game.set2Team2,
            set3Team1: game.set3Team1,
            set3Team2: game.set3Team2,
            winner: game.winner,
            endTime: game.actualEndTime,
          });

          // Emit court status update (now available)
          if (game.courtId) {
            const court = await Court.findOne({ where: { id: game.courtId } });

            // Find next scheduled game for this court
            const nextSlot = await TournamentScheduleSlot.findOne({
              where: {
                tournamentEventId,
                courtId: game.courtId,
                status: ScheduleSlotStatus.SCHEDULED,
                gameId: Not(IsNull()),
              },
              order: { startTime: 'ASC' },
            });

            this.liveGateway.emitCourtStatusUpdate(tournamentEventId, {
              courtId: game.courtId,
              courtName: court?.name ?? `Court ${game.courtId.slice(0, 8)}`,
              status: 'available',
              nextGameId: nextSlot?.gameId ?? undefined,
            });
          }
        } else {
          // Score update only
          this.liveGateway.emitScoreUpdated(tournamentEventId, {
            gameId: game.id,
            courtId: game.courtId,
            status: 'in_progress',
            set1Team1: game.set1Team1,
            set1Team2: game.set1Team2,
            set2Team1: game.set2Team1,
            set2Team2: game.set2Team2,
            set3Team1: game.set3Team1,
            set3Team2: game.set3Team2,
          });
        }
      }
    }

    return game;
  }

  @Mutation(() => Game, { nullable: true, description: 'Assign the next scheduled game to a court' })
  @UseGuards(PermGuard)
  async assignNextGame(
    @User() user: Player,
    @Args('input') input: AssignNextGameInput,
  ): Promise<Game | null> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to assign games');
    }

    // Validate court exists
    const court = await Court.findOne({ where: { id: input.courtId } });
    if (!court) {
      throw new NotFoundException(`Court with ID ${input.courtId} not found`);
    }

    // Check if court already has a game in progress
    const currentSlot = await TournamentScheduleSlot.findOne({
      where: {
        tournamentEventId: input.tournamentEventId,
        courtId: input.courtId,
        status: ScheduleSlotStatus.IN_PROGRESS,
      },
    });

    if (currentSlot) {
      throw new BadRequestException('Court already has a game in progress');
    }

    // Find next available slot for this court
    const nextSlot = await TournamentScheduleSlot.findOne({
      where: {
        tournamentEventId: input.tournamentEventId,
        courtId: input.courtId,
        status: ScheduleSlotStatus.SCHEDULED,
        gameId: Not(IsNull()),
      },
      order: { startTime: 'ASC' },
    });

    if (!nextSlot || !nextSlot.gameId) {
      return null;
    }

    // Get the game
    const game = await Game.findOne({ where: { id: nextSlot.gameId } });
    if (!game) {
      return null;
    }

    // Start the game
    game.actualStartTime = new Date();
    game.courtId = input.courtId;
    await game.save();

    nextSlot.status = ScheduleSlotStatus.IN_PROGRESS;
    await nextSlot.save();

    // Emit WebSocket events
    if (this.liveGateway) {
      this.liveGateway.emitGameStarted(input.tournamentEventId, {
        gameId: game.id,
        courtId: game.courtId,
        status: 'in_progress',
        startTime: game.actualStartTime,
      });

      this.liveGateway.emitCourtStatusUpdate(input.tournamentEventId, {
        courtId: input.courtId,
        courtName: court.name ?? `Court ${input.courtId.slice(0, 8)}`,
        status: 'in_progress',
        currentGameId: game.id,
      });
    }

    return game;
  }

  @Mutation(() => Game, { description: 'Cancel a game in progress (reset to scheduled)' })
  @UseGuards(PermGuard)
  async cancelGameInProgress(
    @User() user: Player,
    @Args('gameId', { type: () => ID }) gameId: string,
  ): Promise<Game> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to cancel games');
    }

    const game = await Game.findOne({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    // Cannot cancel a completed game
    if (game.playedAt) {
      throw new BadRequestException('Cannot cancel a completed game');
    }

    // Store court ID before resetting
    const courtId = game.courtId;

    // Reset game state
    game.actualStartTime = undefined;
    game.set1Team1 = undefined;
    game.set1Team2 = undefined;
    game.set2Team1 = undefined;
    game.set2Team2 = undefined;
    game.set3Team1 = undefined;
    game.set3Team2 = undefined;
    await game.save();

    // Reset schedule slot
    let tournamentEventId: string | undefined;
    if (game.scheduleSlotId) {
      const slot = await TournamentScheduleSlot.findOne({
        where: { id: game.scheduleSlotId },
      });

      if (slot) {
        slot.status = ScheduleSlotStatus.SCHEDULED;
        await slot.save();
        tournamentEventId = slot.tournamentEventId;
      }
    }

    // Emit WebSocket events
    if (this.liveGateway && tournamentEventId) {
      this.liveGateway.emitGameCancelled(tournamentEventId, game.id, courtId);

      if (courtId) {
        const court = await Court.findOne({ where: { id: courtId } });
        this.liveGateway.emitCourtStatusUpdate(tournamentEventId, {
          courtId,
          courtName: court?.name ?? `Court ${courtId.slice(0, 8)}`,
          status: 'available',
          nextGameId: game.id, // The cancelled game becomes the next game
        });
      }
    }

    return game;
  }

  // ============ HELPER METHODS ============

  private formatGameScore(game: Game): string {
    const sets: string[] = [];

    if (game.set1Team1 !== undefined && game.set1Team2 !== undefined) {
      sets.push(`${game.set1Team1}-${game.set1Team2}`);
    }
    if (game.set2Team1 !== undefined && game.set2Team2 !== undefined) {
      sets.push(`${game.set2Team1}-${game.set2Team2}`);
    }
    if (game.set3Team1 !== undefined && game.set3Team2 !== undefined) {
      sets.push(`${game.set3Team1}-${game.set3Team2}`);
    }

    return sets.join(', ') || 'No score';
  }
}
