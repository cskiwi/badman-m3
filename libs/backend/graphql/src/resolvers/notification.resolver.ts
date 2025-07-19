import { Notification } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { NotificationArgs } from '../args';

@Resolver(() => Notification)
export class NotificationResolver {
  @Query(() => Notification)
  async notification(@Args('id', { type: () => ID }) id: string): Promise<Notification> {
    const notification = await Notification.findOne({
      where: {
        id,
      },
    });

    if (notification) {
      return notification;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Notification])
  async notifications(
    @Args('args', { type: () => NotificationArgs, nullable: true })
    inputArgs?: InstanceType<typeof NotificationArgs>,
  ): Promise<Notification[]> {
    const args = NotificationArgs.toFindManyOptions(inputArgs);
    return Notification.find(args);
  }
}
