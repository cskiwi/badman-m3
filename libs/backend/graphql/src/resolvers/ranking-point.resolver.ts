import { AllowAnonymous } from '@app/backend-authorization';
import { RankingPoint } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => RankingPoint)
export class RankingPointResolver {
  @Query(() => RankingPoint)
  @AllowAnonymous()
  async rankingPoint(@Args('id', { type: () => ID }) id: string): Promise<RankingPoint> {
    const rankingPoint = await RankingPoint.findOne({
      where: { id },
      relations: ['player', 'game', 'system'],
    });

    if (!rankingPoint) {
      throw new NotFoundException(id);
    }

    return rankingPoint;
  }

  @Query(() => [RankingPoint])
  @AllowAnonymous()
  async rankingPoints(
    @Args('playerId', { type: () => ID, nullable: true }) playerId?: string,
    @Args('gameId', { type: () => ID, nullable: true }) gameId?: string,
    @Args('systemId', { type: () => ID, nullable: true }) systemId?: string,
  ): Promise<RankingPoint[]> {
    const where: any = {};
    
    if (playerId) where.playerId = playerId;
    if (gameId) where.gameId = gameId;
    if (systemId) where.systemId = systemId;

    return RankingPoint.find({
      where,
      relations: ['player', 'game', 'system'],
      take: 100,
      order: { createdAt: 'DESC' },
    });
  }
}