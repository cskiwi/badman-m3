import { RequestLink } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { RequestLinkArgs } from '../args';

@Resolver(() => RequestLink)
export class RequestLinkResolver {
  @Query(() => RequestLink)
  async requestLink(@Args('id', { type: () => ID }) id: string): Promise<RequestLink> {
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
  async requestLinks(
    @Args('args', { type: () => RequestLinkArgs, nullable: true })
    inputArgs?: InstanceType<typeof RequestLinkArgs>,
  ): Promise<RequestLink[]> {
    const args = RequestLinkArgs.toFindManyOptions(inputArgs);
    return RequestLink.find(args);
  }
}
