import { AllowAnonymous } from '@app/backend-authorization';
import { RankingGroup } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => RankingGroup)
export class RankingGroupResolver {
  @Query(() => RankingGroup)
  @AllowAnonymous()
  async rankingGroup(@Args('id', { type: () => ID }) id: string): Promise<RankingGroup> {
    const rankingGroup = await RankingGroup.findOne({
      where: { id },
    });

    if (!rankingGroup) {
      throw new NotFoundException(id);
    }

    return rankingGroup;
  }

  @Query(() => [RankingGroup])
  @AllowAnonymous()
  async rankingGroups(): Promise<RankingGroup[]> {
    return RankingGroup.find({
      take: 100,
      order: { name: 'ASC' },
    });
  }
}