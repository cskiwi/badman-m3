import { Player } from '@app/models';
import { IsUUID } from '@app/utils';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { Like } from 'typeorm';

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
  async players(): Promise<Player[]> {
    return Player.find({
      where: {
        memberId: Like('3%'),
      },
      take: 10,
    });
  }
}
