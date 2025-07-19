import { TournamentGroupSubEventMembership } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => TournamentGroupSubEventMembership)
export class GroupSubeventMembershipResolver {
  @Query(() => TournamentGroupSubEventMembership)
  async groupSubeventMembership(@Args('id', { type: () => ID }) id: string): Promise<TournamentGroupSubEventMembership> {
    const membership = await TournamentGroupSubEventMembership.findOne({
      where: {
        id,
      },
    });

    if (membership) {
      return membership;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [TournamentGroupSubEventMembership])
  async groupSubeventMemberships(): Promise<TournamentGroupSubEventMembership[]> {
    return TournamentGroupSubEventMembership.find();
  }
}