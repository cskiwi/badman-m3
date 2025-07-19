import { LocationEventMembership } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => LocationEventMembership)
export class LocationEventMembershipResolver {
  @Query(() => LocationEventMembership)
  async locationEventMembership(@Args('id', { type: () => ID }) id: string): Promise<LocationEventMembership> {
    const membership = await LocationEventMembership.findOne({
      where: {
        id,
      },
    });

    if (membership) {
      return membership;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [LocationEventMembership])
  async locationEventMemberships(): Promise<LocationEventMembership[]> {
    return LocationEventMembership.find();
  }
}