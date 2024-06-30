import { User } from '@app/backend-authorization';
import { Player } from '@app/models';
import { Query, Resolver } from '@nestjs/graphql';

@Resolver(() => Player)
export class UserResolver {
  @Query(() => Player, { nullable: true })
  async me(@User() user: Player): Promise<Player | null> {
    if (user?.id) {
      return user;
    } else {
      return null;
    }
  }
}
