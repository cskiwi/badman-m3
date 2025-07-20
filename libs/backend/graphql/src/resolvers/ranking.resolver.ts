import { AllowAnonymous } from '@app/backend-authorization';
import { RankingSystem, RankingPoint, RankingPlace, RankingLastPlace } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver, Parent, ResolveField } from '@nestjs/graphql';

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

  @ResolveField(() => [RankingPoint])
  async rankingPoints(@Parent() system: RankingSystem): Promise<RankingPoint[]> {
    return RankingPoint.find({
      where: { systemId: system.id },
      take: 100,
    });
  }

  @ResolveField(() => [RankingPlace])
  async rankingPlaces(@Parent() system: RankingSystem): Promise<RankingPlace[]> {
    return RankingPlace.find({
      where: { systemId: system.id },
      take: 100,
    });
  }

  @ResolveField(() => [RankingLastPlace])
  async rankingLastPlaces(@Parent() system: RankingSystem): Promise<RankingLastPlace[]> {
    return RankingLastPlace.find({
      where: { systemId: system.id },
      take: 100,
    });
  }
}

