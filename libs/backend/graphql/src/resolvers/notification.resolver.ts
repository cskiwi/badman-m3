import { PermGuard, User } from '@app/backend-authorization';
import { Notification, Player } from '@app/models';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { NotificationArgs } from '../args';

@Resolver(() => Notification)
export class NotificationResolver {
  @Query(() => Notification)
  @UseGuards(PermGuard)
  async notification(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string
  ): Promise<Notification> {
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
  @UseGuards(PermGuard)
  async notifications(
    @User() user: Player,
    @Args('args', { type: () => NotificationArgs, nullable: true })
    inputArgs?: InstanceType<typeof NotificationArgs>,
  ): Promise<Notification[]> {
    const args = NotificationArgs.toFindManyOptions(inputArgs);
    return Notification.find(args);
  }
}
