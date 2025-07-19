import { Court, Location } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { CourtArgs, LocationArgs } from '../../args';

@Resolver(() => Location)
export class LocationResolver {
  @Query(() => Location)
  async location(@Args('id', { type: () => ID }) id: string): Promise<Location> {
    const location = await Location.findOne({
      where: {
        id,
      },
    });

    if (location) {
      return location;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Location])
  async locations(
    @Args('args', { type: () => LocationArgs, nullable: true })
    inputArgs?: InstanceType<typeof LocationArgs>,
  ): Promise<Location[]> {
    const args = LocationArgs.toFindManyOptions(inputArgs);
    return Location.find(args);
  }

  @ResolveField(() => [Court], { nullable: true })
  async courts(
    @Parent() { id }: Location,
    @Args('args', {
      type: () => CourtArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof CourtArgs>,
  ) {
    const args = CourtArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        locationId: id,
      }));
    } else {
      args.where = [
        {
          locationId: id,
        },
      ];
    }

    return Court.find(args);
  }
}
