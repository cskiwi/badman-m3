import { TournamentSubEvent, TournamentDraw, TournamentEvent, TournamentEnrollment, Entry } from '@app/models';
import { EnrollmentStatus } from '@app/models-enum';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Int, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { TournamentSubEventArgs, TournamentDrawArgs, TournamentEnrollmentArgs, EntryArgs } from '../../../args';
import { IsNull } from 'typeorm';

@Resolver(() => TournamentSubEvent)
export class TournamentSubEventResolver {
  @Query(() => TournamentSubEvent)
  async tournamentSubEvent(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TournamentSubEvent> {
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
    @Args('args',  { type: () => TournamentSubEventArgs, nullable: true  })
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
}
