import { PermGuard, User } from '@app/backend-authorization';
import { TournamentDraw, TournamentSubEvent, Game, Entry, TournamentEnrollment, Player } from '@app/models';
import { EnrollmentStatus, GameType } from '@app/models-enum';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Args, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { TournamentDrawArgs, GameArgs, EntryArgs } from '../../../args';
import {
  GenerateEntriesFromEnrollmentsInput,
  AssignEntryToDrawInput,
  AssignEntriesToDrawInput,
  SetEntrySeedInput,
  AutoSeedDrawInput,
  SeedingMethod,
  CreateTournamentDrawInput,
  UpdateTournamentDrawInput,
  RemoveEntryFromDrawInput,
} from '../../../inputs';

@Resolver(() => TournamentDraw)
export class TournamentDrawResolver {
  // ============ QUERIES ============

  @Query(() => TournamentDraw)
  async tournamentDraw(@Args('id', { type: () => ID }) id: string): Promise<TournamentDraw> {
    const draw = await TournamentDraw.findOne({
      where: {
        id,
      },
    });

    if (draw) {
      return draw;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [TournamentDraw])
  async tournamentDraws(
    @Args('args', { type: () => TournamentDrawArgs, nullable: true })
    inputArgs?: InstanceType<typeof TournamentDrawArgs>,
  ): Promise<TournamentDraw[]> {
    const args = TournamentDrawArgs.toFindManyOptions(inputArgs);
    return TournamentDraw.find(args);
  }

  // ============ MUTATIONS ============

  @Mutation(() => TournamentDraw, { description: 'Create a new tournament draw' })
  @UseGuards(PermGuard)
  async createTournamentDraw(
    @User() user: Player,
    @Args('input') input: CreateTournamentDrawInput,
  ): Promise<TournamentDraw> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to create draws');
    }

    // Validate sub-event exists
    const subEvent = await TournamentSubEvent.findOne({
      where: { id: input.subEventId },
    });

    if (!subEvent) {
      throw new NotFoundException(`Sub-event with ID ${input.subEventId} not found`);
    }

    // Create draw
    const draw = new TournamentDraw();
    draw.subeventId = input.subEventId;
    draw.name = input.name;
    draw.type = input.type;
    draw.size = input.size;

    await draw.save();

    return draw;
  }

  @Mutation(() => TournamentDraw, { description: 'Update a tournament draw' })
  @UseGuards(PermGuard)
  async updateTournamentDraw(
    @User() user: Player,
    @Args('drawId', { type: () => ID }) drawId: string,
    @Args('input') input: UpdateTournamentDrawInput,
  ): Promise<TournamentDraw> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to update draws');
    }

    const draw = await TournamentDraw.findOne({
      where: { id: drawId },
    });

    if (!draw) {
      throw new NotFoundException(`Draw with ID ${drawId} not found`);
    }

    // Update fields
    if (input.name !== undefined) draw.name = input.name;
    if (input.type !== undefined) draw.type = input.type;
    if (input.size !== undefined) draw.size = input.size;

    await draw.save();

    return draw;
  }

  @Mutation(() => Boolean, { description: 'Delete a tournament draw' })
  @UseGuards(PermGuard)
  async deleteTournamentDraw(
    @User() user: Player,
    @Args('drawId', { type: () => ID }) drawId: string,
  ): Promise<boolean> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to delete draws');
    }

    const draw = await TournamentDraw.findOne({
      where: { id: drawId },
    });

    if (!draw) {
      throw new NotFoundException(`Draw with ID ${drawId} not found`);
    }

    // Check if draw has games
    const gameCount = await Game.count({
      where: { linkId: drawId, linkType: 'tournament' },
    });

    if (gameCount > 0) {
      throw new BadRequestException('Cannot delete a draw that has games. Delete games first.');
    }

    // Remove entries from draw (don't delete entries, just unassign)
    await Entry.update({ drawId }, { drawId: undefined });

    await draw.remove();

    return true;
  }

  @Mutation(() => [Entry], {
    description: 'Generate entries from confirmed enrollments for a sub-event',
  })
  @UseGuards(PermGuard)
  async generateEntriesFromEnrollments(
    @User() user: Player,
    @Args('input') input: GenerateEntriesFromEnrollmentsInput,
  ): Promise<Entry[]> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to generate entries');
    }

    // Validate sub-event exists
    const subEvent = await TournamentSubEvent.findOne({
      where: { id: input.subEventId },
    });

    if (!subEvent) {
      throw new NotFoundException(`Sub-event with ID ${input.subEventId} not found`);
    }

    // Check if entries already exist
    const existingEntries = await Entry.find({
      where: { subEventId: input.subEventId },
    });

    if (existingEntries.length > 0 && !input.force) {
      throw new BadRequestException(
        'Entries already exist for this sub-event. Use force=true to regenerate.',
      );
    }

    // If force, remove existing entries that were created from enrollments
    if (input.force && existingEntries.length > 0) {
      for (const entry of existingEntries) {
        if (entry.enrollmentId) {
          await entry.remove();
        }
      }
    }

    // Get confirmed enrollments
    const confirmedEnrollments = await TournamentEnrollment.find({
      where: {
        tournamentSubEventId: input.subEventId,
        status: EnrollmentStatus.CONFIRMED,
      },
    });

    if (confirmedEnrollments.length === 0) {
      return [];
    }

    const isDoubles = subEvent.gameType !== GameType.S;
    const createdEntries: Entry[] = [];

    if (isDoubles) {
      // For doubles, create one entry per confirmed pair
      // Group by confirmed partner pairs (avoid duplicates)
      const processedPairs = new Set<string>();

      for (const enrollment of confirmedEnrollments) {
        if (!enrollment.confirmedPartnerId || !enrollment.playerId) continue;

        // Create a unique key for the pair (sorted to avoid duplicates)
        const pairKey = [enrollment.playerId, enrollment.confirmedPartnerId].sort().join('-');

        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // Create entry for the pair
        const entry = new Entry();
        entry.subEventId = input.subEventId;
        entry.player1Id = enrollment.playerId;
        entry.player2Id = enrollment.confirmedPartnerId;
        entry.enrollmentId = enrollment.id;
        entry.entryType = 'tournament';

        await entry.save();
        createdEntries.push(entry);
      }
    } else {
      // For singles, create one entry per confirmed enrollment
      for (const enrollment of confirmedEnrollments) {
        if (!enrollment.playerId) continue;

        const entry = new Entry();
        entry.subEventId = input.subEventId;
        entry.player1Id = enrollment.playerId;
        entry.enrollmentId = enrollment.id;
        entry.entryType = 'tournament';

        await entry.save();
        createdEntries.push(entry);
      }
    }

    return createdEntries;
  }

  @Mutation(() => Entry, { description: 'Assign an entry to a draw' })
  @UseGuards(PermGuard)
  async assignEntryToDraw(
    @User() user: Player,
    @Args('input') input: AssignEntryToDrawInput,
  ): Promise<Entry> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to assign entries');
    }

    const entry = await Entry.findOne({
      where: { id: input.entryId },
    });

    if (!entry) {
      throw new NotFoundException(`Entry with ID ${input.entryId} not found`);
    }

    const draw = await TournamentDraw.findOne({
      where: { id: input.drawId },
    });

    if (!draw) {
      throw new NotFoundException(`Draw with ID ${input.drawId} not found`);
    }

    // Verify entry belongs to same sub-event as draw
    if (entry.subEventId !== draw.subeventId) {
      throw new BadRequestException('Entry and draw belong to different sub-events');
    }

    entry.drawId = input.drawId;
    await entry.save();

    return entry;
  }

  @Mutation(() => [Entry], { description: 'Assign multiple entries to a draw' })
  @UseGuards(PermGuard)
  async assignEntriesToDraw(
    @User() user: Player,
    @Args('input') input: AssignEntriesToDrawInput,
  ): Promise<Entry[]> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to assign entries');
    }

    const draw = await TournamentDraw.findOne({
      where: { id: input.drawId },
    });

    if (!draw) {
      throw new NotFoundException(`Draw with ID ${input.drawId} not found`);
    }

    const entries: Entry[] = [];

    for (const entryId of input.entryIds) {
      const entry = await Entry.findOne({
        where: { id: entryId },
      });

      if (!entry) {
        throw new NotFoundException(`Entry with ID ${entryId} not found`);
      }

      // Verify entry belongs to same sub-event as draw
      if (entry.subEventId !== draw.subeventId) {
        throw new BadRequestException(
          `Entry ${entryId} and draw belong to different sub-events`,
        );
      }

      entry.drawId = input.drawId;
      await entry.save();
      entries.push(entry);
    }

    return entries;
  }

  @Mutation(() => Entry, { description: 'Remove an entry from its draw' })
  @UseGuards(PermGuard)
  async removeEntryFromDraw(
    @User() user: Player,
    @Args('input') input: RemoveEntryFromDrawInput,
  ): Promise<Entry> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to remove entries from draws');
    }

    const entry = await Entry.findOne({
      where: { id: input.entryId },
    });

    if (!entry) {
      throw new NotFoundException(`Entry with ID ${input.entryId} not found`);
    }

    entry.drawId = undefined;
    entry.seed = undefined;
    await entry.save();

    return entry;
  }

  @Mutation(() => Entry, { description: 'Set the seed for an entry' })
  @UseGuards(PermGuard)
  async setEntrySeed(
    @User() user: Player,
    @Args('input') input: SetEntrySeedInput,
  ): Promise<Entry> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to set seeds');
    }

    const entry = await Entry.findOne({
      where: { id: input.entryId },
    });

    if (!entry) {
      throw new NotFoundException(`Entry with ID ${input.entryId} not found`);
    }

    if (!entry.drawId) {
      throw new BadRequestException('Entry must be assigned to a draw before setting seed');
    }

    if (input.seed < 1) {
      throw new BadRequestException('Seed must be at least 1');
    }

    // Check if seed is already taken in this draw
    const existingSeed = await Entry.findOne({
      where: {
        drawId: entry.drawId,
        seed: input.seed,
      },
    });

    if (existingSeed && existingSeed.id !== entry.id) {
      throw new BadRequestException(`Seed ${input.seed} is already assigned to another entry`);
    }

    entry.seed = input.seed;
    await entry.save();

    return entry;
  }

  @Mutation(() => [Entry], { description: 'Auto-seed entries in a draw based on method' })
  @UseGuards(PermGuard)
  async autoSeedDraw(
    @User() user: Player,
    @Args('input') input: AutoSeedDrawInput,
  ): Promise<Entry[]> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to auto-seed');
    }

    const draw = await TournamentDraw.findOne({
      where: { id: input.drawId },
    });

    if (!draw) {
      throw new NotFoundException(`Draw with ID ${input.drawId} not found`);
    }

    // Get all entries in this draw
    const entries = await Entry.find({
      where: { drawId: input.drawId },
    });

    if (entries.length === 0) {
      return [];
    }

    // Sort entries based on method
    let sortedEntries: Entry[];

    switch (input.method) {
      case SeedingMethod.BY_RANKING:
        // Load player ranking data and sort by it
        sortedEntries = await this.sortByRanking(entries);
        break;

      case SeedingMethod.RANDOM:
        // Shuffle randomly
        sortedEntries = this.shuffleArray([...entries]);
        break;

      case SeedingMethod.MANUAL:
        // Keep current order (by seed if exists, otherwise by creation date)
        sortedEntries = entries.sort((a, b) => {
          if (a.seed && b.seed) return a.seed - b.seed;
          if (a.seed) return -1;
          if (b.seed) return 1;
          return a.createdAt.getTime() - b.createdAt.getTime();
        });
        break;

      default:
        sortedEntries = entries;
    }

    // Assign seeds
    for (let i = 0; i < sortedEntries.length; i++) {
      sortedEntries[i].seed = i + 1;
      await sortedEntries[i].save();
    }

    return sortedEntries;
  }

  @Mutation(() => [Entry], { description: 'Clear all seeds from entries in a draw' })
  @UseGuards(PermGuard)
  async clearDrawSeeds(
    @User() user: Player,
    @Args('drawId', { type: () => ID }) drawId: string,
  ): Promise<Entry[]> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to clear seeds');
    }

    const draw = await TournamentDraw.findOne({
      where: { id: drawId },
    });

    if (!draw) {
      throw new NotFoundException(`Draw with ID ${drawId} not found`);
    }

    const entries = await Entry.find({
      where: { drawId },
    });

    for (const entry of entries) {
      entry.seed = undefined;
      await entry.save();
    }

    return entries;
  }

  // ============ RESOLVE FIELDS ============

  @ResolveField(() => TournamentSubEvent, { nullable: true })
  async tournamentSubEvent(@Parent() { subeventId }: TournamentDraw): Promise<TournamentSubEvent | null> {
    if (!subeventId) {
      return null;
    }

    return TournamentSubEvent.findOne({
      where: { id: subeventId },
    });
  }

  @ResolveField(() => [Game], { nullable: true })
  async games(
    @Parent() { id }: TournamentDraw,
    @Args('args', {
      type: () => GameArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof GameArgs>,
  ): Promise<Game[]> {
    const args = GameArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        linkId: id,
        linkType: 'tournament',
      }));
    } else {
      args.where = [
        {
          linkId: id,
          linkType: 'tournament',
        },
      ];
    }

    return Game.find(args);
  }

  @ResolveField(() => [Entry], { nullable: true })
  async entries(
    @Parent() { id }: TournamentDraw,
    @Args('args', {
      type: () => EntryArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof EntryArgs>,
  ): Promise<Entry[]> {
    const args = EntryArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        drawId: id,
      }));
    } else {
      args.where = [
        {
          drawId: id,
        },
      ];
    }

    if (!args.relations?.includes('standing')) {
      args.relations = [...(args.relations || []), 'standing'];
    }

    return Entry.find(args);
  }

  @ResolveField(() => Int, { description: 'Number of entries in this draw' })
  async entryCount(@Parent() { id }: TournamentDraw): Promise<number> {
    return Entry.count({
      where: { drawId: id },
    });
  }

  // ============ HELPER METHODS ============

  /**
   * Sort entries by player ranking (highest ranking first)
   */
  private async sortByRanking(entries: Entry[]): Promise<Entry[]> {
    // Load player data for all entries
    const entriesWithPlayers = await Promise.all(
      entries.map(async (entry) => {
        const player1 = entry.player1Id
          ? await Player.findOne({ where: { id: entry.player1Id } })
          : null;
        const player2 = entry.player2Id
          ? await Player.findOne({ where: { id: entry.player2Id } })
          : null;

        // For doubles, use combined/average ranking
        // For singles, use player1 ranking
        // Lower ranking number = better player (seed 1 = best)
        // We'll use a simple approach: get ranking points if available
        // For now, just sort by player ID as placeholder (actual ranking logic depends on your data model)
        return {
          entry,
          player1,
          player2,
          // Placeholder: in a real implementation, you'd get actual ranking points
          rankingScore: 0,
        };
      }),
    );

    // Sort by ranking score (higher is better, so gets lower seed)
    entriesWithPlayers.sort((a, b) => b.rankingScore - a.rankingScore);

    return entriesWithPlayers.map((e) => e.entry);
  }

  /**
   * Shuffle array randomly (Fisher-Yates algorithm)
   */
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
