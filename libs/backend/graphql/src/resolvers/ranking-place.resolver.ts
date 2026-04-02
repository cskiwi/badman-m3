import { AllowAnonymous, PermGuard, User } from '@app/backend-authorization';
import { Player, RankingGroup, RankingPlace, RankingSystem } from '@app/models';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { RankingPlaceArgs } from '../args';
import { RankingPlaceNewInput, RankingPlaceUpdateInput } from '../inputs';

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

  @Mutation(() => RankingPlace)
  @UseGuards(PermGuard)
  async newRankingPlace(
    @User() user: Player,
    @Args('data') data: RankingPlaceNewInput,
  ): Promise<RankingPlace> {
    if (!(await user.hasAnyPermission(['edit-any:ranking', `${data.playerId}_edit:ranking`]))) {
      throw new ForbiddenException('You do not have permission to create ranking places');
    }

    const place = RankingPlace.create({
      ...data,
    });

    return place.save();
  }

  @Mutation(() => RankingPlace)
  @UseGuards(PermGuard)
  async updateRankingPlace(
    @User() user: Player,
    @Args('data') data: RankingPlaceUpdateInput,
  ): Promise<RankingPlace> {
    const place = await RankingPlace.findOne({ where: { id: data.id } });
    if (!place) {
      throw new NotFoundException(`RankingPlace with id ${data.id} not found`);
    }

    if (!(await user.hasAnyPermission(['edit-any:ranking', `${place.playerId}_edit:ranking`]))) {
      throw new ForbiddenException('You do not have permission to update ranking places');
    }

    Object.assign(place, data);
    return place.save();
  }

  @Mutation(() => Boolean)
  @UseGuards(PermGuard)
  async removeRankingPlace(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    const place = await RankingPlace.findOne({ where: { id } });
    if (!place) {
      throw new NotFoundException(`RankingPlace with id ${id} not found`);
    }

    if (!(await user.hasAnyPermission(['edit-any:ranking', `${place.playerId}_edit:ranking`]))) {
      throw new ForbiddenException('You do not have permission to remove ranking places');
    }

    await place.remove();
    return true;
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