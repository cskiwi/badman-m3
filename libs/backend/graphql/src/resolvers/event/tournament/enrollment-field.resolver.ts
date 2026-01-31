import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { TournamentSubEvent, TournamentEnrollment } from '@app/models';
import { EnrollmentStatus } from '@app/models-enum';

/**
 * Field resolvers for TournamentSubEvent
 * Only handles data that requires database count queries
 *
 * Client-side calculations:
 * - availableSpots = maxEntries - currentEnrollmentCount
 * - isEnrollmentOpen = check enrollmentPhase and dates
 * - isAlreadyEnrolled = check user's enrollments (queried separately)
 */
@Resolver(() => TournamentSubEvent)
export class TournamentSubEventFieldResolver {
  /**
   * Get current waiting list count
   * Requires database count query
   */
  @ResolveField(() => Number, { name: 'waitingListCount', nullable: true })
  async waitingListCount(
    @Parent() subEvent: TournamentSubEvent,
  ): Promise<number> {
    // Count enrollments with status 'WAITING_LIST'
    const count = await TournamentEnrollment.count({
      where: {
        tournamentSubEventId: subEvent.id,
        status: EnrollmentStatus.WAITING_LIST,
      },
    });

    return count;
  }
}
