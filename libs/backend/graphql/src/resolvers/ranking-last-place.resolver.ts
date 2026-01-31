import { AllowAnonymous } from '@app/backend-authorization';
import { Player, RankingGroup, RankingLastPlace, RankingSystem } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { RankingLastPlaceArgs } from '../args';

@Resolver(() => RankingLastPlace)
export class RankingLastPlaceResolver {
  @Query(() => RankingLastPlace)
  @AllowAnonymous()
  async rankingLastPlace(@Args('id', { type: () => ID }) id: string): Promise<RankingLastPlace> {
    const rankingLastPlace = await RankingLastPlace.findOne({
      where: { id },
    });

    if (!rankingLastPlace) {
      throw new NotFoundException(id);
    }

    return rankingLastPlace;
  }

  @Query(() => [RankingLastPlace])
  @AllowAnonymous()
  async rankingLastPlaces(
    @Args('args', { type: () => RankingLastPlaceArgs, nullable: true })
    inputArgs?: InstanceType<typeof RankingLastPlaceArgs>,
  ): Promise<RankingLastPlace[]> {
    const args = RankingLastPlaceArgs.toFindManyOptions(inputArgs);
    return RankingLastPlace.find(args);
  }

  @ResolveField(() => Player, { nullable: true })
  async player(@Parent() { playerId }: RankingLastPlace): Promise<Player | null> {
    return Player.findOne({ where: { id: playerId } });
  }

  @ResolveField(() => RankingSystem, { nullable: true })
  async system(@Parent() { systemId }: RankingLastPlace): Promise<RankingSystem | null> {
    return RankingSystem.findOne({ where: { id: systemId } });
  }

  @ResolveField(() => RankingGroup, { nullable: true })
  async group(@Parent() { groupId }: RankingLastPlace): Promise<RankingGroup | null> {
    if (!groupId) return null;
    return RankingGroup.findOne({ where: { id: groupId } });
  }
}