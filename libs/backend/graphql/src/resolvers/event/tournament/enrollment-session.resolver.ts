import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import {
  EnrollmentSession,
  EnrollmentSessionItem,
  Player,
  TournamentEvent,
} from '@app/models';
import { AllowAnonymous } from '@app/backend-authorization';

/**
 * Field resolvers for EnrollmentSession
 * Follows the established pattern of loading relations on-demand
 */
@Resolver(() => EnrollmentSession)
export class EnrollmentSessionResolver {
  @ResolveField(() => [EnrollmentSessionItem], { nullable: true })
  @AllowAnonymous()
  async items(@Parent() session: EnrollmentSession): Promise<EnrollmentSessionItem[]> {
    const items = await EnrollmentSessionItem.find({
      where: { sessionId: session.id },
    });
    return items;
  }

  @ResolveField(() => Player, { nullable: true })
  @AllowAnonymous()
  async player(@Parent() session: EnrollmentSession): Promise<Player | null> {
    if (!session.playerId) return null;
    return Player.findOne({ where: { id: session.playerId } });
  }

  @ResolveField(() => TournamentEvent, { nullable: true })
  @AllowAnonymous()
  async tournamentEvent(@Parent() session: EnrollmentSession): Promise<TournamentEvent | null> {
    if (!session.tournamentEventId) return null;
    return TournamentEvent.findOne({ where: { id: session.tournamentEventId } });
  }
}
