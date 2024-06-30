import { PermGuard, User } from '@app/backend-authorization';
import { Player } from '@app/models';
import { IsUUID } from '@app/utils';
import { NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { IsNull, Like, Not } from 'typeorm';

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

  @Query(() => Player, { nullable: true })
  @UseGuards(PermGuard)
  async me(@User() user: Player): Promise<Player | null> {
    if (user?.id) {
      return user;
    } else {
      return null;
    }
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
