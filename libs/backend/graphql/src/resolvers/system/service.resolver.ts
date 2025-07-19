import { Service } from '@app/models';
import { IsUUID } from '@app/utils';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ServiceArgs } from '../../args';

@Resolver(() => Service)
export class ServiceResolver {
  @Query(() => Service)
  async service(@Args('id', { type: () => ID }) id: string): Promise<Service> {
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
  async services(
    @Args('args', { type: () => ServiceArgs, nullable: true })
    inputArgs?: InstanceType<typeof ServiceArgs>,
  ): Promise<Service[]> {
    const args = ServiceArgs.toFindManyOptions(inputArgs);
    return Service.find(args);
  }
}