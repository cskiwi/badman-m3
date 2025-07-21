import { AllowAnonymous, PermGuard, User } from '@app/backend-authorization';
import { ClubPlayerMembership, Club, Team, Player } from '@app/models';
import { IsUUID } from '@app/utils';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ClubArgs, TeamArgs } from '../args';

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
    @Args('args', { type: () => ClubArgs, nullable: true })
    inputArgs?: InstanceType<typeof ClubArgs>,
  ): Promise<Club[]> {
    const args = ClubArgs.toFindOneOptions(inputArgs);
    return Club.find(args);
  }

  @ResolveField(() => [Team], { nullable: true })
  async teams(
    @Parent() { id }: Player,
    @Args('args', { type: () => TeamArgs, nullable: true })
    inputArgs?: InstanceType<typeof TeamArgs>,
  ) {
    const args = TeamArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        clubId: id,
      }));
    } else {
      args.where = [
        {
          clubId: id,
        },
      ];
    }

    return Team.find(args);
  }

  @ResolveField(() => [Number], { nullable: true })
  async distinctSeasons(@Parent() { id }: Club): Promise<number[]> {
    const result = await Team.createQueryBuilder('team')
      .select('DISTINCT team.season', 'season')
      .where('team.clubId = :clubId', { clubId: id })
      .andWhere('team.season IS NOT NULL')
      .orderBy('team.season', 'DESC')
      .getRawMany();

    return result.map(row => row.season);
  }
}
