import { Standing } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { StandingArgs } from '../../args';

@Resolver(() => Standing)
export class StandingResolver {
  @Query(() => Standing)
  async standing(@Args('id', { type: () => ID }) id: string): Promise<Standing> {
    const standing = await Standing.findOne({
      where: {
        id,
      },
    });

    if (standing) {
      return standing;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Standing])
  async standings(
    @Args('args', { type: () => StandingArgs, nullable: true })
    inputArgs?: InstanceType<typeof StandingArgs>,
  ): Promise<Standing[]> {
    const args = StandingArgs.toFindManyOptions(inputArgs);
    return Standing.find(args);
  }
}
