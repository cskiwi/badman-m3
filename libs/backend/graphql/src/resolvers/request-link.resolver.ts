import { PermGuard, User } from '@app/backend-authorization';
import { RequestLink, Player } from '@app/models';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { RequestLinkArgs } from '../args';

@Resolver(() => RequestLink)
export class RequestLinkResolver {
  @Query(() => RequestLink)
  @UseGuards(PermGuard)
  async requestLink(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string
  ): Promise<RequestLink> {
    if (!(await user.hasAnyPermission(['link:player']))) {
      throw new ForbiddenException('Insufficient permissions to access request links');
    }
    const requestLink = await RequestLink.findOne({
      where: {
        id,
      },
    });

    if (requestLink) {
      return requestLink;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [RequestLink])
  @UseGuards(PermGuard)
  async requestLinks(
    @User() user: Player,
    @Args('args', { type: () => RequestLinkArgs, nullable: true })
    inputArgs?: InstanceType<typeof RequestLinkArgs>,
  ): Promise<RequestLink[]> {
    if (!(await user.hasAnyPermission(['link:player']))) {
      throw new ForbiddenException('Insufficient permissions to access request links');
    }
    const args = RequestLinkArgs.toFindManyOptions(inputArgs);
    return RequestLink.find(args);
  }
}
