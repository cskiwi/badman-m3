
import { Game, GamePlayerMembership, Player } from '@app/models';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GameArgs, PlayerArgs } from '../args';

@Resolver(() => GamePlayerMembership)
export class GamePlayerMembershipResolver {
  @ResolveField(() => Game, { nullable: true })
  async game(
    @Parent() { gameId }: GamePlayerMembership,
    @Args('args', {
      type: () => GameArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof GameArgs>,
  ) {
    const args = GameArgs.toFindOneOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        id: gameId,
      }));
    } else {
      args.where = [
        {
          id: gameId,
        },
      ];
    }

    return Game.findOne(args);
  }

  @ResolveField(() => Player, { nullable: true })
  async gamePlayer(
    @Parent() { playerId }: GamePlayerMembership,
    @Args('args', {
      type: () => PlayerArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof PlayerArgs>,
  ) {
    const args = PlayerArgs.toFindOneOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        id: playerId,
      }));
    } else {
      args.where = [
        {
          id: playerId,
        },
      ];
    }

    return Player.findOne(args);
  }
}

