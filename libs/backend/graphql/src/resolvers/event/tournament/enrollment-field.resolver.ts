import { Resolver, ResolveField, Parent, Context } from '@nestjs/graphql';
import { TournamentSubEvent, TournamentEnrollment } from '@app/models';
import { EnrollmentEligibility, CapacityInfo } from '../../../inputs/enrollment-output';
import { EnrollmentValidationService } from '../../../services/tournament/enrollment-validation.service';
import { EnrollmentCapacityService } from '../../../services/tournament/enrollment-capacity.service';

/**
 * Field resolvers for computed fields on TournamentSubEvent
 */
@Resolver(() => TournamentSubEvent)
export class TournamentSubEventFieldResolver {
  constructor(
    private validationService: EnrollmentValidationService,
    private capacityService: EnrollmentCapacityService,
  ) {}

  @ResolveField(() => Boolean, { name: 'isEnrollmentOpen' })
  async isEnrollmentOpen(
    @Parent() subEvent: TournamentSubEvent,
  ): Promise<boolean> {
    const validPhases = ['OPEN', 'WAITLIST_ONLY'];
    if (!validPhases.includes(subEvent.enrollmentPhase)) {
      return false;
    }

    const now = new Date();

    // Check per-event dates
    if (subEvent.enrollmentOpenDate && now < subEvent.enrollmentOpenDate) {
      return false;
    }
    if (subEvent.enrollmentCloseDate && now > subEvent.enrollmentCloseDate) {
      return false;
    }

    return true;
  }

  @ResolveField(() => Number, { name: 'availableSpots', nullable: true })
  async availableSpots(
    @Parent() subEvent: TournamentSubEvent,
  ): Promise<number | null> {
    const capacity = await this.capacityService.getCapacity(subEvent.id);
    return capacity.availableSpots === -1 ? null : capacity.availableSpots;
  }

  @ResolveField(() => Number, { name: 'waitingListCount' })
  async waitingListCount(
    @Parent() subEvent: TournamentSubEvent,
  ): Promise<number> {
    const capacity = await this.capacityService.getCapacity(subEvent.id);
    return capacity.waitingListCount;
  }

  @ResolveField(() => TournamentEnrollment, {
    name: 'userEnrollment',
    nullable: true,
  })
  async userEnrollment(
    @Parent() subEvent: TournamentSubEvent,
    @Context() context: { req?: { user?: { player?: { id?: string } } } },
  ): Promise<TournamentEnrollment | null> {
    const playerId = context.req?.user?.player?.id;
    if (!playerId) {
      return null;
    }

    // This would typically use a DataLoader to prevent N+1 queries
    return TournamentEnrollment.findOne({
      where: {
        tournamentSubEventId: subEvent.id,
        playerId,
      },
    });
  }

  @ResolveField(() => Boolean, { name: 'userCanEnroll' })
  async userCanEnroll(
    @Parent() subEvent: TournamentSubEvent,
    @Context() context: any,
  ): Promise<boolean> {
    const playerId = context.req?.user?.player?.id;
    if (!playerId) {
      return false;
    }

    const eligibility = await this.validationService.checkEligibility(
      subEvent.id,
      playerId,
    );

    return eligibility.eligible;
  }

  @ResolveField(() => EnrollmentEligibility, { name: 'enrollmentEligibility' })
  async enrollmentEligibility(
    @Parent() subEvent: TournamentSubEvent,
    @Context() context: any,
  ): Promise<EnrollmentEligibility> {
    const playerId = context.req?.user?.player?.id;

    if (!playerId) {
      // Guest user
      return {
        eligible: false,
        reasons: ['Login required to enroll'],
        hasInvitation: false,
        meetsLevelRequirement: true,
        isAlreadyEnrolled: false,
        hasCapacity: true,
        isWithinEnrollmentWindow: false,
      };
    }

    return this.validationService.checkEligibility(subEvent.id, playerId);
  }
}
