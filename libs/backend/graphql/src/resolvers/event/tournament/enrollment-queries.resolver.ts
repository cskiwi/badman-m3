import { Resolver, Query, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { In, Like } from 'typeorm';
import {
  TournamentSubEvent,
  EnrollmentSession,
  TournamentEnrollment,
  Player,
} from '@app/models';
import { User, PermGuard, AllowAnonymous } from '@app/backend-authorization';
import {
  SubEventFilters,
  PartnerPreferenceInput,
} from '../../../inputs/enrollment.input';
import {
  CartValidationResult,
  SubEventWithEligibility,
} from '../../../inputs/enrollment-output';
import { EnrollmentValidationService } from '../../../services/tournament/enrollment-validation.service';
import { EnrollmentCapacityService } from '../../../services/tournament/enrollment-capacity.service';
import { EnrollmentCartService } from '../../../services/tournament/enrollment-cart.service';

@Resolver()
export class EnrollmentQueriesResolver {
  constructor(
    private validationService: EnrollmentValidationService,
    private capacityService: EnrollmentCapacityService,
    private cartService: EnrollmentCartService,
  ) {}

  /**
   * Get all sub-events for a tournament with enrollment status and eligibility
   */
  @Query(() => [SubEventWithEligibility], { name: 'availableSubEvents' })
  @UseGuards(PermGuard)
  @AllowAnonymous()
  async availableSubEvents(
    @Args('tournamentId', { type: () => ID }) tournamentId: string,
    @Args('filters', { type: () => SubEventFilters, nullable: true })
    filters?: SubEventFilters,
    @User() user?: Player,
  ): Promise<SubEventWithEligibility[]> {
    // Build query
    const queryBuilder = TournamentSubEvent
      .createQueryBuilder('se')
      .leftJoinAndSelect('se.tournamentEvent', 'te')
      .where('se.eventId = :tournamentId', { tournamentId });

    // Apply filters
    if (filters?.eventType && filters.eventType.length > 0) {
      queryBuilder.andWhere('se.eventType IN (:...eventTypes)', {
        eventTypes: filters.eventType,
      });
    }

    if (filters?.gameType && filters.gameType.length > 0) {
      queryBuilder.andWhere('se.gameType IN (:...gameTypes)', {
        gameTypes: filters.gameType,
      });
    }

    if (filters?.level && filters.level.length > 0) {
      queryBuilder.andWhere(
        '(se.minLevel <= ANY(:levels) OR se.minLevel IS NULL)',
        { levels: filters.level },
      );
      queryBuilder.andWhere(
        '(se.maxLevel >= ANY(:levels) OR se.maxLevel IS NULL)',
        { levels: filters.level },
      );
    }

    if (filters?.enrollmentStatus === 'OPEN') {
      queryBuilder.andWhere("se.enrollmentPhase IN ('OPEN', 'WAITLIST_ONLY')");
    } else if (filters?.enrollmentStatus === 'AVAILABLE') {
      queryBuilder.andWhere("se.enrollmentPhase IN ('OPEN', 'WAITLIST_ONLY')");
      queryBuilder.andWhere(
        '(se.maxEntries IS NULL OR se.currentEnrollmentCount < se.maxEntries OR se.waitingListEnabled = true)',
      );
    }

    if (filters?.searchText) {
      queryBuilder.andWhere('se.name ILIKE :search', {
        search: `%${filters.searchText}%`,
      });
    }

    const subEvents = await queryBuilder
      .orderBy('se.eventType', 'ASC')
      .addOrderBy('se.gameType', 'ASC')
      .getMany();

    // Get capacity info for all sub-events
    const capacities = await this.capacityService.getCapacitiesForSubEvents(
      subEvents.map((se) => se.id),
    );

    // Get eligibility for current user if authenticated
    const playerId = user?.id;
    const results: SubEventWithEligibility[] = [];

    for (const subEvent of subEvents) {
      let eligibility;
      if (playerId) {
        eligibility = await this.validationService.checkEligibility(
          subEvent.id,
          playerId,
        );
      } else {
        // Guest - show basic eligibility
        eligibility = {
          eligible: subEvent.enrollmentPhase === 'OPEN',
          reasons: subEvent.enrollmentPhase !== 'OPEN' ? ['Login required'] : [],
          hasInvitation: true,
          meetsLevelRequirement: true,
          isAlreadyEnrolled: false,
          hasCapacity: !capacities.get(subEvent.id)?.isFull,
          isWithinEnrollmentWindow: subEvent.enrollmentPhase === 'OPEN',
        };
      }

      results.push({
        subEvent,
        eligibility,
        capacity: capacities.get(subEvent.id)!,
      });
    }

    return results;
  }

  /**
   * Get current enrollment cart for user or session
   */
  @Query(() => EnrollmentSession, { name: 'enrollmentCart', nullable: true })
  @UseGuards(PermGuard)
  @AllowAnonymous()
  async enrollmentCart(
    @Args('tournamentId', { type: () => ID }) tournamentId: string,
    @Args('sessionId', { nullable: true }) sessionId?: string,
    @User() user?: Player,
  ): Promise<EnrollmentSession | null> {
    return this.cartService.getCartByIdentifier(
      tournamentId,
      user?.id,
      sessionId,
    );
  }

  /**
   * Validate bulk enrollment before submission
   */
  @Query(() => CartValidationResult, { name: 'validateBulkEnrollment' })
  @UseGuards(PermGuard)
  async validateBulkEnrollment(
    @Args('tournamentId', { type: () => ID}) tournamentId: string,
    @Args('subEventIds', { type: () => [ID] }) subEventIds: string[],
    @Args('partnerPreferences', {
      type: () => [PartnerPreferenceInput],
      nullable: true,
    })
    partnerPreferences?: PartnerPreferenceInput[],
    @User() user?: Player,
  ): Promise<CartValidationResult> {
    if (!user?.id) {
      return {
        valid: false,
        errors: [
          {
            subEventId: '',
            subEventName: '',
            errorType: 'NOT_AUTHENTICATED',
            message: 'Player profile required',
          },
        ],
        warnings: [],
      };
    }

    const partnerMap = new Map(
      partnerPreferences?.map((p) => [p.subEventId, p.preferredPartnerId]) || [],
    );

    return this.validationService.validateBulkEnrollment(
      tournamentId,
      subEventIds,
      user.id,
      partnerMap,
    );
  }

  /**
   * Get user's enrollments for a tournament
   */
  @Query(() => [TournamentEnrollment], { name: 'myTournamentEnrollments' })
  @UseGuards(PermGuard)
  async myTournamentEnrollments(
    @Args('tournamentId', { type: () => ID }) tournamentId: string,
    @User() user: Player,
  ): Promise<TournamentEnrollment[]> {
    if (!user?.id) {
      return [];
    }

    return TournamentEnrollment.find({
      where: {
        playerId: user.id,
        tournamentSubEvent: { eventId: tournamentId },
      },
      relations: [
        'tournamentSubEvent',
        'preferredPartner',
        'confirmedPartner',
      ],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Search for potential partners
   */
  @Query(() => [Player], { name: 'searchPartners' })
  @UseGuards(PermGuard)
  @AllowAnonymous()
  async searchPartners(
    @Args('query', { type: () => String }) query: string,
  ): Promise<Player[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const searchPattern = `%${query}%`;

    return Player.find({
      where: [
        { firstName: Like(searchPattern) },
        { lastName: Like(searchPattern) },
        { fullName: Like(searchPattern) },
      ],
      take: 10,
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }
}
