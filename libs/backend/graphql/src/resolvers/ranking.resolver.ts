import { AllowAnonymous } from '@app/backend-authorization';
import { RankingSystem } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => RankingSystem)
export class RankingSystemResolver {
  @Query(() => RankingSystem)
  @AllowAnonymous()
  async rankingSystem(
    @Args('id', { type: () => ID, nullable: true }) id: string,
  ): Promise<RankingSystem> {
    const rankingsystem = id
      ? await RankingSystem.findOne({
          where: {
            id,
          },
        })
      : await RankingSystem.findOne({
          where: {
            primary: true,
          },
        });

    if (rankingsystem) {
      return rankingsystem;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [RankingSystem])
  @AllowAnonymous()
  async rankingSystems(): Promise<RankingSystem[]> {
    return RankingSystem.find({
      take: 10,
    });
  }
}
