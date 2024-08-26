import { SubEventCompetition } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ListArgs } from '../../utils';

@Resolver(() => SubEventCompetition)
export class SubEventCompetitionResolver {
  @Query(() => SubEventCompetition)
  async subEventCompetition(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<SubEventCompetition> {
    const comp = await SubEventCompetition.findOne({
      where: {
        id,
      },
    });

    if (comp) {
      return comp;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [SubEventCompetition])
  async subEventCompetitions(
    @Args() listArgs: ListArgs<SubEventCompetition>,
  ): Promise<SubEventCompetition[]> {
    const args = ListArgs.toFindOptions(listArgs);
    return SubEventCompetition.find(args);
  }
}
