import { SubEventCompetition } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { SubEventCompetitionArgs } from '../../args';

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
    @Args('args',  { type: () => SubEventCompetitionArgs, nullable: true  })
    inputArgs?: InstanceType<typeof SubEventCompetitionArgs>,
  ): Promise<SubEventCompetition[]> {
    const args = SubEventCompetitionArgs.toFindOneOptions(inputArgs);
    return SubEventCompetition.find(args);
  }
}
