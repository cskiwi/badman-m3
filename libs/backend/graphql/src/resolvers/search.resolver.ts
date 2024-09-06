import { PermGuard } from '@app/backend-authorization';
import { Player } from '@app/models';
import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';

@Resolver(() => Player)
export class SearchResolver {
  @Query(() => Player, { nullable: true })
  @UseGuards(PermGuard)
  async search(): Promise<Player | null> {
    return null;
  }
}
