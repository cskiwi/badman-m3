import { AllowAnonymous } from '@app/backend-authorization';
import { RankingPlace } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => RankingPlace)
export class RankingPlaceResolver {
  @Query(() => RankingPlace)
  @AllowAnonymous()
  async rankingPlace(@Args('id', { type: () => ID }) id: string): Promise<RankingPlace> {
    const rankingPlace = await RankingPlace.findOne({
      where: { id },
      relations: ['player', 'system'],
    });

    if (!rankingPlace) {
      throw new NotFoundException(id);
    }

    return rankingPlace;
  }

  @Query(() => [RankingPlace])
  @AllowAnonymous()
  async rankingPlaces(
    @Args('playerId', { type: () => ID, nullable: true }) playerId?: string,
    @Args('systemId', { type: () => ID, nullable: true }) systemId?: string,
  ): Promise<RankingPlace[]> {
    const where: any = {};
    
    if (playerId) where.playerId = playerId;
    if (systemId) where.systemId = systemId;

    return RankingPlace.find({
      where,
      relations: ['player', 'system'],
      take: 100,
      order: { rankingDate: 'DESC' },
    });
  }
}