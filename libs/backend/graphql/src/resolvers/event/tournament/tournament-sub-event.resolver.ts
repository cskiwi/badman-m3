import { PermGuard, User } from '@app/backend-authorization';
import { TournamentSubEvent, TournamentDraw, TournamentEvent, TournamentEnrollment, Entry, Player } from '@app/models';
import { EnrollmentStatus } from '@app/models-enum';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { TournamentSubEventArgs, TournamentDrawArgs, TournamentEnrollmentArgs, EntryArgs } from '../../../args';
import { TournamentSubEventNewInput, TournamentSubEventUpdateInput } from '../../../inputs';
import { IsNull } from 'typeorm';

@Resolver(() => TournamentSubEvent)
export class TournamentSubEventResolver {
  @Query(() => TournamentSubEvent)
  async tournamentSubEvent(@Args('id', { type: () => ID }) id: string): Promise<TournamentSubEvent> {
    const comp = await TournamentSubEvent.findOne({
      where: {
        id,
      },
    });

    if (comp) {
      return comp;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [TournamentSubEvent])
  async tournamentSubEvents(
    @Args('args', { type: () => TournamentSubEventArgs, nullable: true })
    inputArgs?: InstanceType<typeof TournamentSubEventArgs>,
  ): Promise<TournamentSubEvent[]> {
    const args = TournamentSubEventArgs.toFindOneOptions(inputArgs);
    return TournamentSubEvent.find(args);
  }

  @ResolveField(() => [TournamentDraw], { nullable: true })
  async drawTournaments(
    @Parent() { id }: TournamentSubEvent,
    @Args('args', {
      type: () => TournamentDrawArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof TournamentDrawArgs>,
  ): Promise<TournamentDraw[]> {
    const args = TournamentDrawArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        subeventId: id,
      }));
    } else {
      args.where = [
        {
          subeventId: id,
        },
      ];
    }

    return TournamentDraw.find(args);
  }

  @ResolveField(() => TournamentEvent, { nullable: true })
  async tournamentEvent(@Parent() { eventId }: TournamentSubEvent): Promise<TournamentEvent | null> {
    if (!eventId) {
      return null;
    }

    return TournamentEvent.findOne({
      where: { id: eventId },
    });
  }

  @ResolveField(() => [TournamentEnrollment], { nullable: true, description: 'All enrollments for this sub-event' })
  async enrollments(
    @Parent() { id }: TournamentSubEvent,
    @Args('args', { type: () => TournamentEnrollmentArgs, nullable: true })
    inputArgs?: InstanceType<typeof TournamentEnrollmentArgs>,
  ): Promise<TournamentEnrollment[]> {
    const args = TournamentEnrollmentArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        tournamentSubEventId: id,
      }));
    } else {
      args.where = [{ tournamentSubEventId: id }];
    }

    return TournamentEnrollment.find(args);
  }

  @ResolveField(() => Int, { description: 'Count of confirmed enrollments' })
  async confirmedEnrollmentCount(@Parent() { id }: TournamentSubEvent): Promise<number> {
    return TournamentEnrollment.count({
      where: {
        tournamentSubEventId: id,
        status: EnrollmentStatus.CONFIRMED,
      },
    });
  }

  @ResolveField(() => Int, { description: 'Count of pending enrollments (waiting for partner)' })
  async pendingEnrollmentCount(@Parent() { id }: TournamentSubEvent): Promise<number> {
    return TournamentEnrollment.count({
      where: {
        tournamentSubEventId: id,
        status: EnrollmentStatus.PENDING,
      },
    });
  }

  @ResolveField(() => Int, { description: 'Count of players on waiting list' })
  async waitingListCount(@Parent() { id }: TournamentSubEvent): Promise<number> {
    return TournamentEnrollment.count({
      where: {
        tournamentSubEventId: id,
        status: EnrollmentStatus.WAITING_LIST,
      },
    });
  }

  @ResolveField(() => [Entry], { nullable: true, description: 'All entries for this sub-event' })
  async entries(
    @Parent() { id }: TournamentSubEvent,
    @Args('args', { type: () => EntryArgs, nullable: true })
    inputArgs?: InstanceType<typeof EntryArgs>,
  ): Promise<Entry[]> {
    const args = EntryArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        subEventId: id,
      }));
    } else {
      args.where = [{ subEventId: id }];
    }

    return Entry.find(args);
  }

  @ResolveField(() => [Entry], { nullable: true, description: 'Entries not yet assigned to any draw' })
  async unassignedEntries(@Parent() { id }: TournamentSubEvent): Promise<Entry[]> {
    return Entry.find({
      where: {
        subEventId: id,
        drawId: IsNull(),
      },
    });
  }

  @ResolveField(() => Int, { description: 'Total number of entries' })
  async entryCount(@Parent() { id }: TournamentSubEvent): Promise<number> {
    return Entry.count({
      where: { subEventId: id },
    });
  }

  @ResolveField(() => Int, { description: 'Number of entries not yet assigned to a draw' })
  async unassignedEntryCount(@Parent() { id }: TournamentSubEvent): Promise<number> {
    return Entry.count({
      where: {
        subEventId: id,
        drawId: IsNull(),
      },
    });
  }

  // ============ MUTATIONS ============

  @Mutation(() => TournamentSubEvent, { description: 'Create a new tournament sub-event' })
  @UseGuards(PermGuard)
  async createTournamentSubEvent(@User() user: Player, @Args('data') data: TournamentSubEventNewInput): Promise<TournamentSubEvent> {
    // Find the tournament event
    const tournament = await TournamentEvent.findOne({ where: { id: data.eventId } });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${data.eventId} not found`);
    }

    // Check permission
    const hasPermission = user.hasAnyPermission([
      'edit-any:tournament',
      'edit-any:club',
      `${tournament.clubId}_edit:club`,
      `${tournament.clubId}_edit:tournament`,
    ]);

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to create sub-events for this tournament');
    }

    // Create the sub-event
    const subEvent = new TournamentSubEvent();
    subEvent.eventId = data.eventId;
    subEvent.name = data.name;
    subEvent.gameType = data.gameType;
    subEvent.minLevel = data.minLevel ?? undefined;
    subEvent.maxLevel = data.maxLevel ?? undefined;
    subEvent.maxEntries = data.maxEntries ?? undefined;
    subEvent.waitingListEnabled = data.waitingListEnabled ?? true;

    await subEvent.save();

    return subEvent;
  }

  @Mutation(() => TournamentSubEvent, { description: 'Update a tournament sub-event' })
  @UseGuards(PermGuard)
  async updateTournamentSubEvent(
    @User() user: Player,
    @Args('subEventId', { type: () => ID }) subEventId: string,
    @Args('data') data: TournamentSubEventUpdateInput,
  ): Promise<TournamentSubEvent> {
    const subEvent = await TournamentSubEvent.findOne({
      where: { id: subEventId },
      relations: ['tournamentEvent'],
    });

    if (!subEvent) {
      throw new NotFoundException(`Sub-event with ID ${subEventId} not found`);
    }

    // Get the tournament for permission check
    const tournament = await TournamentEvent.findOne({ where: { id: subEvent.eventId } });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Check permission
    const hasPermission = user.hasAnyPermission([
      'edit-any:tournament',
      'edit-any:club',
      `${tournament.clubId}_edit:club`,
      `${tournament.clubId}_edit:tournament`,
    ]);

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to update this sub-event');
    }

    // Update fields
    if (data.name !== undefined) subEvent.name = data.name;
    if (data.minLevel !== undefined) subEvent.minLevel = data.minLevel;
    if (data.maxLevel !== undefined) subEvent.maxLevel = data.maxLevel;
    if (data.maxEntries !== undefined) subEvent.maxEntries = data.maxEntries;
    if (data.waitingListEnabled !== undefined) subEvent.waitingListEnabled = data.waitingListEnabled;

    await subEvent.save();

    return subEvent;
  }

  @Mutation(() => Boolean, { description: 'Delete a tournament sub-event' })
  @UseGuards(PermGuard)
  async deleteTournamentSubEvent(@User() user: Player, @Args('subEventId', { type: () => ID }) subEventId: string): Promise<boolean> {
    const subEvent = await TournamentSubEvent.findOne({
      where: { id: subEventId },
    });

    if (!subEvent) {
      throw new NotFoundException(`Sub-event with ID ${subEventId} not found`);
    }

    // Get the tournament for permission check
    const tournament = await TournamentEvent.findOne({ where: { id: subEvent.eventId } });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Check permission
    const hasPermission = user.hasAnyPermission([
      'edit-any:tournament',
      'edit-any:club',
      `${tournament.clubId}_edit:club`,
      `${tournament.clubId}_delete:tournament`,
    ]);

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to delete this sub-event');
    }

    // Check if there are enrollments
    const enrollmentCount = await TournamentEnrollment.count({
      where: { tournamentSubEventId: subEventId },
    });

    if (enrollmentCount > 0) {
      throw new ForbiddenException('Cannot delete sub-event with existing enrollments');
    }

    await subEvent.remove();

    return true;
  }
}
