import { Club, ClubPlayerMembership, Player } from '@app/models';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

@Resolver(() => ClubPlayerMembership)
export class ClubPlayerMembershipResolver {
  @ResolveField(() => [Club], { nullable: true })
  async club(@Parent() { clubId }: ClubPlayerMembership) {
    return Club.findOne({
      where: {
        id: clubId,
      },
    });
  }

  @ResolveField(() => [Player], { nullable: true })
  async player(@Parent() { playerId }: ClubPlayerMembership) {
    return Player.findOne({
      where: {
        id: playerId,
      },
    });
  }
}
