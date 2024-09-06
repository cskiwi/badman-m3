import { ClubPlayerMembership, Club, Team } from '@app/models';
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
import { ClubArgs } from '../args';

@Resolver(() => Club)
export class ClubResolver {
  @Query(() => Club)
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
  async clubs(
    @Args('args',  { type: () => ClubArgs, nullable: true  })
    inputArgs?: InstanceType<typeof ClubArgs>,
  ): Promise<Club[]> {
    const args = ClubArgs.toFindOneOptions(inputArgs);
    return Club.find(args);
  }

  @ResolveField(() => [ClubPlayerMembership], { nullable: true })
  async clubPlayerMemberships(@Parent() { id }: Club) {
    return ClubPlayerMembership.find({
      where: {
        clubId: id,
      },
    });
  }

  @ResolveField(() => [Team], { nullable: true })
  async teams(@Parent() { id }: Club) {
    return Team.find({
      where: {
        clubId: id,
      },
    });
  }
}
