import { User } from '@app/backend-authorization';
import { AppUser } from '@app/models';
import { Query, Resolver } from '@nestjs/graphql';

@Resolver(() => AppUser)
export class UserResolver {
  @Query(() => AppUser, { nullable: true })
  async me(@User() user: AppUser): Promise<AppUser | null> {
    if (user?.id) {
      return user;
    } else {
      return null;
    }
  }
}
