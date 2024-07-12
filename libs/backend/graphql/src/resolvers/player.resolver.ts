import {
  Club,
  ClubPlayerMembership,
  Player,
  RankingLastPlace,
} from '@app/models';
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
import { Like } from 'typeorm';
import { WhereArgs } from '../utils/list.args';
import { ListArgs } from '../utils/input';

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
    return Player.find(listArgs);
  }

  @ResolveField(() => [ClubPlayerMembership], { nullable: true })
  async clubPlayerMemberships(@Parent() { id }: Player) {
    return ClubPlayerMembership.find({
      where: {
        playerId: id,
      },
    });
  }

  @ResolveField(() => [RankingLastPlace], { nullable: true })
  async rankingLastPlaces(
    @Parent() { id }: Player,
    @Args() listArgs: ListArgs<RankingLastPlace>,
  ) {
    const args = ListArgs.toFindOptions(listArgs);

    args.where = args.where.map((where) => ({
      ...where,
      playerId: id,
    }));

    return RankingLastPlace.find(args);
  }
}
