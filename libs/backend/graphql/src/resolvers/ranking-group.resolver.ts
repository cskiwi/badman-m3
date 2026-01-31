import { AllowAnonymous } from '@app/backend-authorization';
import { RankingGroup, RankingSystemRankingGroupMembership } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { RankingGroupArgs, RankingSystemRankingGroupMembershipArgs } from '../args';

@Resolver(() => RankingGroup)
export class RankingGroupResolver {
  @Query(() => RankingGroup)
  @AllowAnonymous()
  async rankingGroup(@Args('id', { type: () => ID }) id: string): Promise<RankingGroup> {
    const rankingGroup = await RankingGroup.findOne({
      where: { id },
    });

    if (!rankingGroup) {
      throw new NotFoundException(id);
    }

    return rankingGroup;
  }

  @Query(() => [RankingGroup])
  @AllowAnonymous()
  async rankingGroups(
    @Args('args', { type: () => RankingGroupArgs, nullable: true })
    inputArgs?: InstanceType<typeof RankingGroupArgs>,
  ): Promise<RankingGroup[]> {
    const args = RankingGroupArgs.toFindManyOptions(inputArgs);
    return RankingGroup.find(args);
  }

  @ResolveField(() => [RankingSystemRankingGroupMembership], { nullable: true })
  async rankingSystemRankingGroupMemberships(
    @Parent() { id }: RankingGroup,
    @Args('args', { type: () => RankingSystemRankingGroupMembershipArgs, nullable: true })
    inputArgs?: InstanceType<typeof RankingSystemRankingGroupMembershipArgs>,
  ): Promise<RankingSystemRankingGroupMembership[]> {
    const args = RankingSystemRankingGroupMembershipArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        groupId: id,
      }));
    } else {
      args.where = [{ groupId: id }];
    }

    return RankingSystemRankingGroupMembership.find(args);
  }
}
