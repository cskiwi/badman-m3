import { Availability } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { AvailabilityArgs } from '../../args';

@Resolver(() => Availability)
export class AvailabilityResolver {
  @Query(() => Availability)
  async availability(@Args('id', { type: () => ID }) id: string): Promise<Availability> {
    const availability = await Availability.findOne({
      where: {
        id,
      },
    });

    if (availability) {
      return availability;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Availability])
  async availabilities(
    @Args('args', { type: () => AvailabilityArgs, nullable: true })
    inputArgs?: InstanceType<typeof AvailabilityArgs>,
  ): Promise<Availability[]> {
    const args = AvailabilityArgs.toFindManyOptions(inputArgs);
    return Availability.find(args);
  }
}
