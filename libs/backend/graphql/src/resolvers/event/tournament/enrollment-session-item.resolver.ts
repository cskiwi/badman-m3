import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import {
  EnrollmentSessionItem,
  EnrollmentSession,
  TournamentSubEvent,
  Player,
} from '@app/models';
import { AllowAnonymous } from '@app/backend-authorization';

/**
 * Field resolvers for EnrollmentSessionItem
 * Follows the established pattern of loading relations on-demand
 */
@Resolver(() => EnrollmentSessionItem)
export class EnrollmentSessionItemResolver {
  @ResolveField(() => EnrollmentSession)
  @AllowAnonymous()
  async session(@Parent() item: EnrollmentSessionItem): Promise<EnrollmentSession> {
    return EnrollmentSession.findOne({ where: { id: item.sessionId } }) as Promise<EnrollmentSession>;
  }

  @ResolveField(() => TournamentSubEvent)
  @AllowAnonymous()
  async tournamentSubEvent(@Parent() item: EnrollmentSessionItem): Promise<TournamentSubEvent> {
    return TournamentSubEvent.findOne({
      where: { id: item.tournamentSubEventId }
    }) as Promise<TournamentSubEvent>;
  }

  @ResolveField(() => Player, { nullable: true })
  @AllowAnonymous()
  async preferredPartner(@Parent() item: EnrollmentSessionItem): Promise<Player | null> {
    if (!item.preferredPartnerId) return null;
    return Player.findOne({ where: { id: item.preferredPartnerId } });
  }
}
