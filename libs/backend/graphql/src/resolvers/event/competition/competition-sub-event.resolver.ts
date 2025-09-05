import { CompetitionSubEvent, CompetitionEvent, CompetitionDraw } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { CompetitionSubEventArgs, CompetitionDrawArgs } from '../../../args';

@Resolver(() => CompetitionSubEvent)
export class CompetitionSubEventResolver {
  @Query(() => CompetitionSubEvent)
  async competitionSubEvent(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CompetitionSubEvent> {
    const comp = await CompetitionSubEvent.findOne({
      where: {
        id,
      },
    });

    if (comp) {
      return comp;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [CompetitionSubEvent])
  async competitionSubEvents(
    @Args('args',  { type: () => CompetitionSubEventArgs, nullable: true  })
    inputArgs?: InstanceType<typeof CompetitionSubEventArgs>,
  ): Promise<CompetitionSubEvent[]> {
    const args = CompetitionSubEventArgs.toFindManyOptions(inputArgs);
    return CompetitionSubEvent.find(args);
  }

  @ResolveField(() => CompetitionEvent, { nullable: true })
  async competitionEvent(@Parent() { eventId }: CompetitionSubEvent): Promise<CompetitionEvent | null> {
    if (!eventId) {
      return null;
    }

    return CompetitionEvent.findOne({
      where: { id: eventId },
    });
  }

  @ResolveField(() => [CompetitionDraw], { nullable: true })
  async competitionDraws(
    @Parent() { id }: CompetitionSubEvent,
    @Args('args', {
      type: () => CompetitionDrawArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof CompetitionDrawArgs>,
  ): Promise<CompetitionDraw[]> {
    const args = CompetitionDrawArgs.toFindManyOptions(inputArgs);

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

    return CompetitionDraw.find(args);
  }
}
