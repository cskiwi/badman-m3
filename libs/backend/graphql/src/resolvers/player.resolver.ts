import { ClubPlayerMembership, GamePlayerMembership, Player, RankingLastPlace } from '@app/models';
import { IsUUID } from '@app/utils';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ClubPlayerMembershipArgs, GamePlayerMembershipArgs, PlayerArgs, RankingLastPlaceArgs } from '../args';
import { User } from '@app/backend-authorization';

@Resolver(() => Player)
export class PlayerResolver {
  @Query(() => Player)
  async player(@Args('id', { type: () => ID }) id: string): Promise<Player> {
    const player = IsUUID(id)
      ? await Player.findOne({
          where: {
            id,
          },
        })
      : await Player.findOne({
          where: {
            slug: id,
          },
        });

    if (player) {
      return player;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Player])
  async players(
    @Args('args', { type: () => PlayerArgs, nullable: true })
    inputArgs?: InstanceType<typeof PlayerArgs>,
  ): Promise<Player[]> {
    const args = PlayerArgs.toFindManyOptions(inputArgs);
    return Player.find(args);
  }

  @ResolveField(() => String)
  async phone(@User() user: Player, @Parent() player: Player) {
    const perm = [`details-any:player`, `${player.id}_details:player`];
    if (await user.hasAnyPermission(perm)) {
      return player.phone;
    }

    return null;
  }

  @ResolveField(() => String)
  async email(@User() user: Player, @Parent() player: Player) {
    const perm = [`details-any:player`, `${player.id}_details:player`];
    if (player.id == user.id || (await user.hasAnyPermission(perm))) {
      return player.email;
    }
    return null;
  }

  @ResolveField(() => String)
  async birthDate(@User() user: Player, @Parent() player: Player) {
    const perm = [`details-any:player`, `${player.id}_details:player`];
    if (player.id == user.id || (await user.hasAnyPermission(perm))) {
      return player.birthDate;
    }
    return null;
  }

  @ResolveField(() => [ClubPlayerMembership], { nullable: true })
  async clubPlayerMemberships(
    @Parent() { id }: Player,
    @Args('args', {
      type: () => ClubPlayerMembershipArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof ClubPlayerMembershipArgs>,
  ) {
    const args = ClubPlayerMembershipArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        playerId: id,
      }));
    } else {
      args.where = [
        {
          playerId: id,
        },
      ];
    }

    return ClubPlayerMembership.find(args);
  }

  @ResolveField(() => [GamePlayerMembership], { nullable: true })
  async gamePlayerMemberships(
    @Parent() { id }: Player,
    @Args('args', {
      type: () => GamePlayerMembershipArgs,
      nullable: true, 
    })
    inputArgs?: InstanceType<typeof GamePlayerMembershipArgs>,
  ) {
    const args = GamePlayerMembershipArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        playerId: id,
      }));
    } else {
      args.where = [
        {
          playerId: id,
        },
      ];
    }

    return GamePlayerMembership.find(args);
  }

  @ResolveField(() => [RankingLastPlace], { nullable: true })
  async rankingLastPlaces(
    @Parent() { id }: Player,
    @Args('args', { type: () => RankingLastPlaceArgs, nullable: true })
    inputArgs?: InstanceType<typeof RankingLastPlaceArgs>,
  ) {
    const args = RankingLastPlaceArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        playerId: id,
      }));
    } else {
      args.where = [
        {
          playerId: id,
        },
      ];
    }

    return RankingLastPlace.find(args);
  }
}
