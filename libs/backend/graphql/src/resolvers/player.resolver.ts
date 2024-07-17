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
import { ListArgs } from '../utils';

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
  async players(@Args() listArgs: ListArgs<Player>): Promise<Player[]> {
    const args = ListArgs.toFindOptions(listArgs);
    return Player.find(args);
  }

  @ResolveField(() => [ClubPlayerMembership], { nullable: true })
  async clubPlayerMemberships(
    @Parent() { id }: Player,
    @Args() listArgs: ListArgs<ClubPlayerMembership>,
  ) {
    const args = ListArgs.toFindOptions(listArgs);

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
    @Args() listArgs: ListArgs<RankingLastPlace>,
  ) {
    const args = ListArgs.toFindOptions(listArgs);

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
