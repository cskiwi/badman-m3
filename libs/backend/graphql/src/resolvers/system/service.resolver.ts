import { PermGuard, User } from '@app/backend-authorization';
import { Service, Player } from '@app/models';
import { IsUUID } from '@app/utils';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ServiceArgs } from '../../args';

@Resolver(() => Service)
export class ServiceResolver {
  @Query(() => Service)
  @UseGuards(PermGuard)
  async service(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string
  ): Promise<Service> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to access services');
    }
    const service = await Service.findOne({
      where: {
        id,
      },
    });

    if (service) {
      return service;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Service])
  @UseGuards(PermGuard)
  async services(
    @User() user: Player,
    @Args('args', { type: () => ServiceArgs, nullable: true })
    inputArgs?: InstanceType<typeof ServiceArgs>,
  ): Promise<Service[]> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to access services');
    }
    const args = ServiceArgs.toFindManyOptions(inputArgs);
    return Service.find(args);
  }
}