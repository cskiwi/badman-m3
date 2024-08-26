import { EventCompetition } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ListArgs } from '../../utils';
import { IsUUID } from '@app/utils';

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
    @Args() listArgs: ListArgs<EventCompetition>,
  ): Promise<EventCompetition[]> {
    const args = ListArgs.toFindOptions(listArgs);
    return EventCompetition.find(args);
  }
}
