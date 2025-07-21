import { AllowAnonymous, PermGuard, User } from '@app/backend-authorization';
import { TeamPlayerMembership, Team, Player } from '@app/models';
import { IsUUID } from '@app/utils';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { TeamArgs } from '../args';

@Resolver(() => Team)
export class TeamResolver {
  @Query(() => Team)
  @AllowAnonymous()
  async team(@Args('id', { type: () => ID }) id: string): Promise<Team> {
    const team = IsUUID(id)
      ? await Team.findOne({
          where: {
            id,
          },
        })
      : await Team.findOne({
          where: {
            slug: id,
          },
        });

    if (team) {
      return team;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Team])
  @AllowAnonymous()
  async teams(
    @Args('args', { type: () => TeamArgs, nullable: true })
    inputArgs?: InstanceType<typeof TeamArgs>,
  ): Promise<Team[]> {
    const args = TeamArgs.toFindOneOptions(inputArgs);
    return Team.find(args);
  }

  @ResolveField(() => [TeamPlayerMembership], { nullable: true })
  @UseGuards(PermGuard)
  async teamPlayerMemberships(@User() user: Player, @Parent() { id }: Team) {
    if (!(await user.hasAnyPermission(['membership:team', `${id}_membership:team`]))) {
      throw new ForbiddenException('Insufficient permissions to access team memberships');
    }
    return TeamPlayerMembership.find({
      where: {
        teamId: id,
      },
    });
  }

  @ResolveField(() => Player, { nullable: true })
  async captain(@Parent() { captainId }: Team) {
    return Player.findOne({
      where: {
        id: captainId,
      },
    });
  }
}
