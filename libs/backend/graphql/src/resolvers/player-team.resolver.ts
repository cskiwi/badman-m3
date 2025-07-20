import { Team, TeamPlayerMembership, Player } from '@app/models';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { TeamArgs, PlayerArgs } from '../args';

@Resolver(() => TeamPlayerMembership)
export class TeamPlayerMembershipResolver {
  @ResolveField(() => Team, { nullable: true })
  async Team(
    @Parent() { teamId }: TeamPlayerMembership,
    @Args('args', {
      type: () => TeamArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof TeamArgs>,
  ) {
    const args = TeamArgs.toFindOneOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        id: teamId,
      }));
    } else {
      args.where = [
        {
          id: teamId,
        },
      ];
    }

    return Team.findOne(args);
  }

  @ResolveField(() => Player, { nullable: true })
  async player(
    @Parent() { playerId }: TeamPlayerMembership,
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
