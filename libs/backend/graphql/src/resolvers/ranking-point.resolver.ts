import { AllowAnonymous } from '@app/backend-authorization';
import { Game, Player, RankingPoint, RankingSystem } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { RankingPointArgs } from '../args';

@Resolver(() => RankingPoint)
export class RankingPointResolver {
  @Query(() => RankingPoint)
  @AllowAnonymous()
  async rankingPoint(@Args('id', { type: () => ID }) id: string): Promise<RankingPoint> {
    const rankingPoint = await RankingPoint.findOne({
      where: { id },
    });

    if (!rankingPoint) {
      throw new NotFoundException(id);
    }

    return rankingPoint;
  }

  @Query(() => [RankingPoint])
  @AllowAnonymous()
  async rankingPoints(
    @Args('args', { type: () => RankingPointArgs, nullable: true })
    inputArgs?: InstanceType<typeof RankingPointArgs>,
  ): Promise<RankingPoint[]> {
    const args = RankingPointArgs.toFindManyOptions(inputArgs);
    return RankingPoint.find(args);
  }

  @ResolveField(() => Player, { nullable: true })
  async player(@Parent() { playerId }: RankingPoint): Promise<Player | null> {
    return Player.findOne({ where: { id: playerId } });
  }

  @ResolveField(() => Game, { nullable: true })
  async game(@Parent() { gameId }: RankingPoint): Promise<Game | null> {
    return Game.findOne({ where: { id: gameId } });
  }

  @ResolveField(() => RankingSystem, { nullable: true })
  async system(@Parent() { systemId }: RankingPoint): Promise<RankingSystem | null> {
    return RankingSystem.findOne({ where: { id: systemId } });
  }
}