import { AllowAnonymous, PermGuard, User } from '@app/backend-authorization';
import { ClubPlayerMembership, GamePlayerMembership, Player, RankingLastPlace, TeamPlayerMembership, Claim } from '@app/models';
import { IsUUID } from '@app/utils';
import { NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ClubPlayerMembershipArgs, GamePlayerMembershipArgs, PlayerArgs, RankingLastPlaceArgs, TeamPlayerMembershipArgs, ClaimArgs } from '../args';

@Resolver(() => Player)
export class PlayerResolver {
  @Query(() => Player)
  @UseGuards(PermGuard)
  @AllowAnonymous()
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
  @UseGuards(PermGuard)
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

  @ResolveField(() => [TeamPlayerMembership], { nullable: true })
  async teamPlayerMemberships(
    @Parent() { id }: Player,
    @Args('args', {
      type: () => TeamPlayerMembershipArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof TeamPlayerMembershipArgs>,
  ) {
    const args = TeamPlayerMembershipArgs.toFindManyOptions(inputArgs);

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

    return TeamPlayerMembership.find(args);
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

  @ResolveField(() => [Claim], { nullable: true })
  async claims(
    @Parent() { id }: Player,
    @Args('args', { type: () => ClaimArgs, nullable: true })
    inputArgs?: InstanceType<typeof ClaimArgs>,
  ) {
    const args = ClaimArgs.toFindManyOptions(inputArgs);

    // Get claims through the many-to-many relationship
    const player = await Player.findOne({
      where: { id },
      relations: ['claims'],
    });

    if (!player) {
      return [];
    }

    let claims = player.claims || [];

    // Apply filtering if provided
    if (args.where && args.where.length > 0) {
      claims = claims.filter(claim => {
        return args.where!.some(whereCondition => {
          // Simple filtering logic - can be extended as needed
          if (whereCondition.type && claim.type !== whereCondition.type) {
            return false;
          }
          if (whereCondition.category && claim.category !== whereCondition.category) {
            return false;
          }
          return true;
        });
      });
    }

    // Apply ordering if specified
    if (args.order) {
      claims.sort((a, b) => {
        // Simple name-based sorting - can be extended
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
      });
    }

    return claims;
  }
}
