import { Club, ClubPlayerMembership, Player } from '@app/models';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ClubArgs, PlayerArgs } from '../args';

@Resolver(() => ClubPlayerMembership)
export class ClubPlayerMembershipResolver {
  @ResolveField(() => Club, { nullable: true })
  async club(
    @Parent() { clubId }: ClubPlayerMembership,
    @Args('args', {
      type: () => ClubArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof ClubArgs>,
  ) {
    const args = ClubArgs.toFindOneOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        id: clubId,
      }));
    } else {
      args.where = [
        {
          id: clubId,
        },
      ];
    }

    return Club.findOne(args);
  }

  @ResolveField(() => Player, { nullable: true })
  async player(
    @Parent() { playerId }: ClubPlayerMembership,
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
