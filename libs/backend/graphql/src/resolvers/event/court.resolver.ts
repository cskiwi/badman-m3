import { Court } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { CourtArgs } from '../../args';

@Resolver(() => Court)
export class CourtResolver {
  @Query(() => Court)
  async court(@Args('id', { type: () => ID }) id: string): Promise<Court> {
    const court = await Court.findOne({
      where: {
        id,
      },
    });

    if (court) {
      return court;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Court])
  async courts(
    @Args('args', { type: () => CourtArgs, nullable: true })
    inputArgs?: InstanceType<typeof CourtArgs>,
  ): Promise<Court[]> {
    const args = CourtArgs.toFindManyOptions(inputArgs);
    return Court.find(args);
  }
}
