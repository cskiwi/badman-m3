import { AllowAnonymous } from '@app/backend-authorization';
import { CompetitionEvent, CompetitionSubEvent } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { IsUUID } from '@app/utils';
import { CompetitionEventArgs, CompetitionSubEventArgs } from '../../../args';

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
}
