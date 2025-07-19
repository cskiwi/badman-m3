import { CompetitionEvent, CompetitionSubEvent } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { IsUUID } from '@app/utils';
import { CompetitionEventArgs } from '../../../args';

@Resolver(() => CompetitionEvent)
export class CompetitionEventResolver {
  @Query(() => CompetitionEvent)
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
  async competitionEvents(
    @Args('args',  { type: () => CompetitionEventArgs, nullable: true  })
    inputArgs?: InstanceType<typeof CompetitionEventArgs>,
  ): Promise<CompetitionEvent[]> {
    const args = CompetitionEventArgs.toFindOneOptions(inputArgs);
    return CompetitionEvent.find(args);
  }

  @ResolveField(() => [CompetitionSubEvent], { nullable: true })
  async competitionSubEvents(@Parent() { id }: CompetitionEvent): Promise<CompetitionSubEvent[]> {
    return CompetitionSubEvent.find({
      where: {
        eventId: id,
      },
    });
  }
}
