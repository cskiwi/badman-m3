import { EventCompetition } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { IsUUID } from '@app/utils';
import { EventCompetitionArgs } from '../../args';

@Resolver(() => EventCompetition)
export class EventCompetitionResolver {
  @Query(() => EventCompetition)
  async eventCompetition(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<EventCompetition> {
    const comp = IsUUID(id)
      ? await EventCompetition.findOne({
          where: {
            id,
          },
        })
      : await EventCompetition.findOne({
          where: {
            slug: id,
          },
        });

    if (comp) {
      return comp;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [EventCompetition])
  async eventCompetitions(
    @Args('args',  { type: () => EventCompetitionArgs, nullable: true  })
    inputArgs?: InstanceType<typeof EventCompetitionArgs>,
  ): Promise<EventCompetition[]> {
    const args = EventCompetitionArgs.toFindOneOptions(inputArgs);
    return EventCompetition.find(args);
  }
}
