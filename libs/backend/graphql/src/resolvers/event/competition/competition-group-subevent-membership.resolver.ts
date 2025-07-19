import { CompetitionGroupSubEventMembership } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => CompetitionGroupSubEventMembership)
export class CompetitionGroupSubEventMembershipResolver {
  @Query(() => CompetitionGroupSubEventMembership)
  async competitionGroupSubEventMembership(@Args('id', { type: () => ID }) id: string): Promise<CompetitionGroupSubEventMembership> {
    const membership = await CompetitionGroupSubEventMembership.findOne({
      where: {
        id,
      },
    });

    if (membership) {
      return membership;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [CompetitionGroupSubEventMembership])
  async competitionGroupSubEventMemberships(): Promise<CompetitionGroupSubEventMembership[]> {
    return CompetitionGroupSubEventMembership.find();
  }
}
