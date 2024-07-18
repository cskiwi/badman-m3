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
import { ListArgs } from '../utils';

@Resolver(() => Club)
export class ClubResolver {
  @Query(() => Club)
  async club(@Args('id', { type: () => ID }) id: string): Promise<Club> {
    const club = IsUUID(id)
      ? await Club.findOne({
          where: {
            id,
          },
          relations: ['ClubPlayerMemberships'],
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
  async clubs(@Args() listArgs: ListArgs<Club>): Promise<Club[]> {
    const args = ListArgs.toFindOptions(listArgs);
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
