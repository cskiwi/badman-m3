import { AllowAnonymous } from '@app/backend-authorization';
import { Player, RankingGroup, RankingPlace, RankingSystem } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { RankingPlaceArgs } from '../args';

@Resolver(() => RankingPlace)
export class RankingPlaceResolver {
  @Query(() => RankingPlace)
  @AllowAnonymous()
  async rankingPlace(@Args('id', { type: () => ID }) id: string): Promise<RankingPlace> {
    const rankingPlace = await RankingPlace.findOne({
      where: { id },
    });

    if (!rankingPlace) {
      throw new NotFoundException(id);
    }

    return rankingPlace;
  }

  @Query(() => [RankingPlace])
  @AllowAnonymous()
  async rankingPlaces(
    @Args('args', { type: () => RankingPlaceArgs, nullable: true })
    inputArgs?: InstanceType<typeof RankingPlaceArgs>,
  ): Promise<RankingPlace[]> {
    const args = RankingPlaceArgs.toFindManyOptions(inputArgs);
    return RankingPlace.find(args);
  }

  @ResolveField(() => Player, { nullable: true })
  async player(@Parent() { playerId }: RankingPlace): Promise<Player | null> {
    return Player.findOne({ where: { id: playerId } });
  }

  @ResolveField(() => RankingSystem, { nullable: true })
  async system(@Parent() { systemId }: RankingPlace): Promise<RankingSystem | null> {
    return RankingSystem.findOne({ where: { id: systemId } });
  }

  @ResolveField(() => RankingGroup, { nullable: true })
  async group(@Parent() { groupId }: RankingPlace): Promise<RankingGroup | null> {
    if (!groupId) return null;
    return RankingGroup.findOne({ where: { id: groupId } });
  }
}