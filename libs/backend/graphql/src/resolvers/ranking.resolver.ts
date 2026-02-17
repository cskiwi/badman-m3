import { AllowAnonymous } from '@app/backend-authorization';
import { RankingSystem, RankingPoint, RankingPlace, RankingLastPlace } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver, Parent, ResolveField } from '@nestjs/graphql';
import { RankingSystemArgs, RankingPointArgs, RankingPlaceArgs, RankingLastPlaceArgs } from '../args';

@Resolver(() => RankingSystem)
export class RankingSystemResolver {
  @Query(() => RankingSystem)
  @AllowAnonymous()
  async rankingSystem(
    @Args('id', { type: () => ID, nullable: true }) id: string,
    @Args('date', { type: () => Date, nullable: true }) date?: Date,
  ): Promise<RankingSystem> {
    const rankingsystem = id
      ? await RankingSystem.findOne({
          where: {
            id,
          },
        })
      : await RankingSystem.findActiveSystem(date ?? new Date());

    if (rankingsystem) {
      return rankingsystem;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [RankingSystem])
  @AllowAnonymous()
  async rankingSystems(
    @Args('args', { type: () => RankingSystemArgs, nullable: true })
    inputArgs?: InstanceType<typeof RankingSystemArgs>,
  ): Promise<RankingSystem[]> {
    const args = RankingSystemArgs.toFindManyOptions(inputArgs);
    return RankingSystem.find(args);
  }

  @ResolveField(() => [RankingPoint])
  async rankingPoints(
    @Parent() system: RankingSystem,
    @Args('args', {
      type: () => RankingPointArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof RankingPointArgs>,
  ): Promise<RankingPoint[]> {
    const args = RankingPointArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        systemId: system.id,
      }));
    } else {
      args.where = [
        {
          systemId: system.id,
        },
      ];
    }

    return RankingPoint.find(args);
  }

  @ResolveField(() => [RankingPlace])
  async rankingPlaces(
    @Parent() system: RankingSystem,
    @Args('args', {
      type: () => RankingPlaceArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof RankingPlaceArgs>,
  ): Promise<RankingPlace[]> {
    const args = RankingPlaceArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        systemId: system.id,
      }));
    } else {
      args.where = [
        {
          systemId: system.id,
        },
      ];
    }

    return RankingPlace.find(args);
  }

  @ResolveField(() => [RankingLastPlace])
  async rankingLastPlaces(
    @Parent() system: RankingSystem,
    @Args('args', {
      type: () => RankingLastPlaceArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof RankingLastPlaceArgs>,
  ): Promise<RankingLastPlace[]> {
    const args = RankingLastPlaceArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        systemId: system.id,
      }));
    } else {
      args.where = [
        {
          systemId: system.id,
        },
      ];
    }

    return RankingLastPlace.find(args);
  }
}

