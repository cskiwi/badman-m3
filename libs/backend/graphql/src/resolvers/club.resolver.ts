import { ClubPlayerMembership, Club } from '@app/models';
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
import { Like } from 'typeorm';

@Resolver(() => Club)
export class ClubResolver {
  @Query(() => Club)
  async Club(@Args('id', { type: () => ID }) id: string): Promise<Club> {
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
  async Clubs(): Promise<Club[]> {
    return Club.find({
      take: 10,
    });
  }

  @ResolveField(() => [ClubPlayerMembership], { nullable: true })
  async clubPlayerMemberships(@Parent() { id }: Club) {
    return ClubPlayerMembership.find({
      where: {
        clubId: id,
      },
    });
  }
}
