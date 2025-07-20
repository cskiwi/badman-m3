import { AllowAnonymous } from '@app/backend-authorization';
import { RankingLastPlace } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => RankingLastPlace)
export class RankingLastPlaceResolver {
  @Query(() => RankingLastPlace)
  @AllowAnonymous()
  async rankingLastPlace(@Args('id', { type: () => ID }) id: string): Promise<RankingLastPlace> {
    const rankingLastPlace = await RankingLastPlace.findOne({
      where: { id },
      relations: ['player', 'system'],
    });

    if (!rankingLastPlace) {
      throw new NotFoundException(id);
    }

    return rankingLastPlace;
  }

  @Query(() => [RankingLastPlace])
  @AllowAnonymous()
  async rankingLastPlaces(
    @Args('playerId', { type: () => ID, nullable: true }) playerId?: string,
    @Args('systemId', { type: () => ID, nullable: true }) systemId?: string,
  ): Promise<RankingLastPlace[]> {
    const where: any = {};
    
    if (playerId) where.playerId = playerId;
    if (systemId) where.systemId = systemId;

    return RankingLastPlace.find({
      where,
      relations: ['player', 'system'],
      take: 100,
      order: { rankingDate: 'DESC' },
    });
  }
}