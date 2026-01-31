import { PermGuard, User } from '@app/backend-authorization';
import { TournamentEvent, TournamentSubEvent, Club, Player } from '@app/models';
import { TournamentPhase } from '@app/models-enum';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver, registerEnumType } from '@nestjs/graphql';
import { IsUUID } from '@app/utils';
import { TournamentEventArgs, TournamentSubEventArgs } from '../../../args';
import { TournamentEventNewInput, TournamentEventUpdateInput } from '../../../inputs';

// Register TournamentPhase enum for GraphQL
registerEnumType(TournamentPhase, {
  name: 'TournamentPhase',
  description: 'Phase of a tournament event',
});

@Resolver(() => TournamentEvent)
export class TournamentEventResolver {
  @Query(() => TournamentEvent)
  async tournamentEvent(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TournamentEvent> {
    const comp = IsUUID(id)
      ? await TournamentEvent.findOne({
          where: {
            id,
          },
        })
      : await TournamentEvent.findOne({
          where: {
            slug: id,
          },
        });

    if (comp) {
      return comp;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [TournamentEvent])
  async tournamentEvents(
    @Args('args',  { type: () => TournamentEventArgs, nullable: true  })
    inputArgs?: InstanceType<typeof TournamentEventArgs>,
  ): Promise<TournamentEvent[]> {
    const args = TournamentEventArgs.toFindOneOptions(inputArgs);
    return TournamentEvent.find(args);
  }

  @ResolveField(() => [TournamentSubEvent], { nullable: true })
  async tournamentSubEvents(
    @Parent() { id }: TournamentEvent,
    @Args('args', {
      type: () => TournamentSubEventArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof TournamentSubEventArgs>,
  ): Promise<TournamentSubEvent[]> {
    const args = TournamentSubEventArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        eventId: id,
      }));
    } else {
      args.where = [
        {
          eventId: id,
        },
      ];
    }

    return TournamentSubEvent.find(args);
  }

  @ResolveField(() => Club, { nullable: true })
  async club(@Parent() { clubId }: TournamentEvent): Promise<Club | null> {
    if (!clubId) {
      return null;
    }
    return Club.findOne({ where: { id: clubId } });
  }

  // ============ MUTATIONS ============

  @Mutation(() => TournamentEvent, { description: 'Create a new tournament event' })
  @UseGuards(PermGuard)
  async createTournamentEvent(
    @User() user: Player,
    @Args('data') data: TournamentEventNewInput,
  ): Promise<TournamentEvent> {
    // Check permission - user must have create permission for tournaments
    const hasPermission = user.hasAnyPermission([
      'create-any:tournament',
      'edit-any:club',
      `${data.clubId}_edit:club`,
      `${data.clubId}_create:tournament`,
    ]);

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to create tournaments for this club');
    }

    // Validate club exists
    const club = await Club.findOne({ where: { id: data.clubId } });
    if (!club) {
      throw new NotFoundException(`Club with ID ${data.clubId} not found`);
    }

    // Create the tournament event
    const tournament = new TournamentEvent();
    tournament.name = data.name;
    tournament.clubId = data.clubId;
    tournament.firstDay = data.firstDay;
    tournament.openDate = data.openDate;
    tournament.closeDate = data.closeDate;
    tournament.official = data.official ?? false;
    tournament.phase = TournamentPhase.DRAFT;

    // Generate slug from name
    tournament.slug = this.generateSlug(data.name);

    await tournament.save();

    return tournament;
  }

  @Mutation(() => TournamentEvent, { description: 'Update a tournament event' })
  @UseGuards(PermGuard)
  async updateTournamentEvent(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: TournamentEventUpdateInput,
  ): Promise<TournamentEvent> {
    const tournament = await TournamentEvent.findOne({ where: { id } });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }

    // Check permission
    const hasPermission = user.hasAnyPermission([
      'edit-any:tournament',
      'edit-any:club',
      `${tournament.clubId}_edit:club`,
      `${tournament.clubId}_edit:tournament`,
    ]);

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to update this tournament');
    }

    // Update fields
    if (data.name !== undefined) {
      tournament.name = data.name;
      tournament.slug = this.generateSlug(data.name);
    }
    if (data.firstDay !== undefined) tournament.firstDay = data.firstDay;
    if (data.openDate !== undefined) tournament.openDate = data.openDate;
    if (data.closeDate !== undefined) tournament.closeDate = data.closeDate;
    if (data.official !== undefined) tournament.official = data.official;
    if (data.enrollmentOpenDate !== undefined) tournament.enrollmentOpenDate = data.enrollmentOpenDate;
    if (data.enrollmentCloseDate !== undefined) tournament.enrollmentCloseDate = data.enrollmentCloseDate;
    if (data.allowGuestEnrollments !== undefined) tournament.allowGuestEnrollments = data.allowGuestEnrollments;
    if (data.schedulePublished !== undefined) tournament.schedulePublished = data.schedulePublished;

    await tournament.save();

    return tournament;
  }

  @Mutation(() => Boolean, { description: 'Delete a tournament event' })
  @UseGuards(PermGuard)
  async deleteTournamentEvent(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    const tournament = await TournamentEvent.findOne({ where: { id } });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }

    // Check permission
    const hasPermission = user.hasAnyPermission([
      'delete-any:tournament',
      'edit-any:club',
      `${tournament.clubId}_edit:club`,
      `${tournament.clubId}_delete:tournament`,
    ]);

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to delete this tournament');
    }

    await tournament.remove();

    return true;
  }

  @Mutation(() => TournamentEvent, { description: 'Update tournament phase' })
  @UseGuards(PermGuard)
  async updateTournamentPhase(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string,
    @Args('phase', { type: () => TournamentPhase }) phase: TournamentPhase,
  ): Promise<TournamentEvent> {
    const tournament = await TournamentEvent.findOne({ where: { id } });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }

    // Check permission
    const hasPermission = user.hasAnyPermission([
      'edit-any:tournament',
      'edit-any:club',
      `${tournament.clubId}_edit:club`,
      `${tournament.clubId}_edit:tournament`,
    ]);

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to update this tournament phase');
    }

    // Update phase
    tournament.phase = phase;
    await tournament.save();

    return tournament;
  }

  // ============ HELPER METHODS ============

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
