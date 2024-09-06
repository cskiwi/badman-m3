import { ClubPlayerMembership, Player, RankingLastPlace } from '@app/models';
import { IsUUID } from '@app/utils';
import { NotFoundException } from '@nestjs/common';
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import {
  ClubPlayerMembershipArgs,
  PlayerArgs,
  RankingLastPlaceArgs,
} from '../args';

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
    @Args('args',{ type: () => PlayerArgs, nullable: true })
    inputArgs?: InstanceType<typeof PlayerArgs>,
  ): Promise<Player[]> {
    const args = PlayerArgs.toFindManyOptions(inputArgs);
    return Player.find(args);
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
    const args = ClubPlayerMembershipArgs.toFindOneOptions(inputArgs);

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

  @ResolveField(() => [RankingLastPlace], { nullable: true })
  async rankingLastPlaces(
    @Parent() { id }: Player,
    @Args('args',  { type: () => RankingLastPlaceArgs, nullable: true })
    inputArgs?: InstanceType<typeof RankingLastPlaceArgs>,
  ) {
    const args = RankingLastPlaceArgs.toFindOneOptions(inputArgs);

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
