import { Game, GamePlayerMembership } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { GameArgs, GamePlayerMembershipArgs } from '../args';

@Resolver(() => Game)
export class GameResolver {
  @Query(() => Game)
  async game(@Args('id', { type: () => ID }) id: string): Promise<Game> {
    const game = await Game.findOne({
      where: {
        id,
      },
    });

    if (game) {
      return game;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Game])
  async games(
    @Args('args', { type: () => GameArgs, nullable: true })
    inputArgs?: InstanceType<typeof GameArgs>,
  ): Promise<Game[]> {
    const args = GameArgs.toFindOneOptions(inputArgs);
    return Game.find(args);
  }

  @ResolveField(() => [GamePlayerMembership], { nullable: true })
  async gamePlayerMemberships(
    @Parent() { id }: Game,
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
        gameId: id,
      }));
    } else {
      args.where = [
        {
          gameId: id,
        },
      ];
    }
    return GamePlayerMembership.find(args);
  }
}
