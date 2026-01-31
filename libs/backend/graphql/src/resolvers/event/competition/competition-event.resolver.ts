import { AllowAnonymous, PermGuard, User } from '@app/backend-authorization';
import { CompetitionEvent, CompetitionSubEvent, Player } from '@app/models';
import { NotFoundException, UseGuards, UnauthorizedException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver, Mutation } from '@nestjs/graphql';
import { IsUUID } from '@app/utils';
import { CompetitionEventArgs, CompetitionSubEventArgs } from '../../../args';
import { CompetitionEventUpdateInput } from '../../../inputs';

@Resolver(() => CompetitionEvent)
export class CompetitionEventResolver {
  @Query(() => CompetitionEvent)
  @AllowAnonymous()
  async competitionEvent(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CompetitionEvent> {
    const comp = IsUUID(id)
      ? await CompetitionEvent.findOne({
          where: {
            id,
          },
        })
      : await CompetitionEvent.findOne({
          where: {
            slug: id,
          },
        });

    if (comp) {
      return comp;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [CompetitionEvent])
  @AllowAnonymous()
  async competitionEvents(
    @Args('args',  { type: () => CompetitionEventArgs, nullable: true  })
    inputArgs?: InstanceType<typeof CompetitionEventArgs>,
  ): Promise<CompetitionEvent[]> {
    const args = CompetitionEventArgs.toFindManyOptions(inputArgs);
    return CompetitionEvent.find(args);
  }

  @ResolveField(() => [CompetitionSubEvent], { nullable: true })
  async competitionSubEvents(
    @Parent() { id }: CompetitionEvent,
    @Args('args', {
      type: () => CompetitionSubEventArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof CompetitionSubEventArgs>,
  ): Promise<CompetitionSubEvent[]> {
    const args = CompetitionSubEventArgs.toFindManyOptions(inputArgs);

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

    return CompetitionSubEvent.find(args);
  }

  @Mutation(() => CompetitionEvent)
  @UseGuards(PermGuard)
  async updateCompetitionEvent(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: CompetitionEventUpdateInput,
    @User() user: Player,
  ): Promise<CompetitionEvent> {
    // Find the competition to update
    const competition = await CompetitionEvent.findOne({
      where: { id },
    });

    if (!competition) {
      throw new NotFoundException(`Competition with ID ${id} not found`);
    }

    // Check permissions
    const canEdit = await user.hasAnyPermission([
      'edit-any:competition',
      `${competition.id}_edit:competition`,
    ]);

    if (!canEdit) {
      throw new UnauthorizedException('You do not have permission to edit this competition');
    }

    // Filter out undefined values and only include fields that have actually changed
    const fieldsToUpdate = Object.entries(input).filter(([key, value]) => {
      if (value === undefined) return false;

      // Compare with original value to see if it actually changed
      const originalValue = competition[key as keyof CompetitionEvent];

      // Handle date comparison specially
      if (
        key.includes('Date') ||
        key === 'openDate' ||
        key === 'closeDate'
      ) {
        const newDate = value ? new Date(value as string | Date).getTime() : null;
        const originalDate =
          originalValue && (typeof originalValue === 'string' || originalValue instanceof Date)
            ? new Date(originalValue).getTime()
            : null;
        return newDate !== originalDate;
      }

      // For other fields, direct comparison
      return value !== originalValue;
    });

    // Only proceed if there are actual changes to make
    if (fieldsToUpdate.length === 0) {
      return competition; // No changes needed
    }

    // Update the competition with only the changed values
    const updateData = Object.fromEntries(fieldsToUpdate);
    Object.assign(competition, {
      ...updateData,
      updatedAt: new Date(),
    });

    // Save and return the updated competition
    return await competition.save();
  }
}
