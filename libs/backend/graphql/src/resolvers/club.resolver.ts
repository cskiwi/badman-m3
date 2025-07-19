import { AllowAnonymous, PermGuard, User } from '@app/backend-authorization';
import { ClubPlayerMembership, Club, Team, Player } from '@app/models';
import { IsUUID } from '@app/utils';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ClubArgs } from '../args';

@Resolver(() => Club)
export class ClubResolver {
  @Query(() => Club)
  @AllowAnonymous()
  async club(@Args('id', { type: () => ID }) id: string): Promise<Club> {
    const club = IsUUID(id)
      ? await Club.findOne({
          where: {
            id,
          },
        })
      : await Club.findOne({
          where: {
            slug: id,
          },
        });

    if (club) {
      return club;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Club])
  @AllowAnonymous()
  async clubs(
    @Args('args',  { type: () => ClubArgs, nullable: true  })
    inputArgs?: InstanceType<typeof ClubArgs>,
  ): Promise<Club[]> {
    const args = ClubArgs.toFindOneOptions(inputArgs);
    return Club.find(args);
  }

  @ResolveField(() => [ClubPlayerMembership], { nullable: true })
  @UseGuards(PermGuard)
  async clubPlayerMemberships(
    @User() user: Player,
    @Parent() { id }: Club
  ) {
    if (!(await user.hasAnyPermission(['membership:club', `${id}_membership:club`]))) {
      throw new ForbiddenException('Insufficient permissions to access club memberships');
    }
    return ClubPlayerMembership.find({
      where: {
        clubId: id,
      },
    });
  }

  @ResolveField(() => [Team], { nullable: true })
  @UseGuards(PermGuard)
  async teams(
    @User() user: Player,
    @Parent() { id }: Club
  ) {
    if (!(await user.hasAnyPermission(['details-any:team', `${id}_details:team`]))) {
      throw new ForbiddenException('Insufficient permissions to access club teams');
    }
    return Team.find({
      where: {
        clubId: id,
      },
    });
  }
}
