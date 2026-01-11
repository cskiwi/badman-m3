import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { EnrollmentSession } from '@app/models';
import { PermGuard, AllowAnonymous } from '@app/backend-authorization';
import { EnrollmentSessionArgs } from '../../../args';

/**
 * Minimal enrollment queries following standard Args pattern.
 *
 * Client should use standard queries instead of custom endpoints:
 * - tournamentSubEvents(args: { where: { eventId } }) - Get all sub-events
 * - tournamentEnrollments(args: { where: { playerId, tournamentSubEvent: { eventId } } }) - Get user enrollments
 * - players(args: { where: { OR: [{ firstName: Like }, { lastName: Like }] } }) - Search partners
 *
 * Field resolvers provide computed data:
 * - TournamentSubEvent.enrollmentEligibility - Check if user can enroll
 * - TournamentSubEvent.availableSpots - Get capacity info
 * - TournamentSubEvent.isEnrollmentOpen - Check if enrollment is open
 */
@Resolver()
export class EnrollmentQueriesResolver {
  /**
   * Get single enrollment session by filters
   * Standard Args pattern like team/club/player resolvers
   */
  @Query(() => EnrollmentSession, { name: 'enrollmentSession', nullable: true })
  @UseGuards(PermGuard)
  @AllowAnonymous()
  async enrollmentSession(
    @Args('args', { type: () => EnrollmentSessionArgs, nullable: true })
    inputArgs?: InstanceType<typeof EnrollmentSessionArgs>,
  ): Promise<EnrollmentSession | null> {
    const args = EnrollmentSessionArgs.toFindOneOptions(inputArgs);
    return EnrollmentSession.findOne(args);
  }

  /**
   * Get multiple enrollment sessions by filters
   * Standard Args pattern like team/club/player resolvers
   */
  @Query(() => [EnrollmentSession], { name: 'enrollmentSessions' })
  @UseGuards(PermGuard)
  @AllowAnonymous()
  async enrollmentSessions(
    @Args('args', { type: () => EnrollmentSessionArgs, nullable: true })
    inputArgs?: InstanceType<typeof EnrollmentSessionArgs>,
  ): Promise<EnrollmentSession[]> {
    const args = EnrollmentSessionArgs.toFindManyOptions(inputArgs);
    return EnrollmentSession.find(args);
  }
}
