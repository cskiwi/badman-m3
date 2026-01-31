import { AllowAnonymous, PermGuard, User } from '@app/backend-authorization';
import { Player, TournamentEnrollment, TournamentSubEvent, TournamentEvent } from '@app/models';
import { EnrollmentStatus, TournamentPhase, GameType } from '@app/models-enum';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import {
  Args,
  ID,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  registerEnumType,
} from '@nestjs/graphql';
import { IsNull, Not } from 'typeorm';
import { EnrollPlayerInput, EnrollGuestInput, UpdateEnrollmentInput } from '../../../inputs';
import { TournamentEnrollmentArgs } from '../../../args';

// Register enums for GraphQL
registerEnumType(EnrollmentStatus, {
  name: 'EnrollmentStatus',
  description: 'Status of a tournament enrollment',
});

@Resolver(() => TournamentEnrollment)
export class TournamentEnrollmentResolver {
  // ============ QUERIES ============

  @Query(() => TournamentEnrollment)
  @AllowAnonymous()
  async tournamentEnrollment(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TournamentEnrollment> {
    const enrollment = await TournamentEnrollment.findOne({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    return enrollment;
  }

  @Query(() => [TournamentEnrollment])
  @AllowAnonymous()
  async tournamentEnrollments(
    @Args('args', { type: () => TournamentEnrollmentArgs, nullable: true })
    inputArgs?: InstanceType<typeof TournamentEnrollmentArgs>,
  ): Promise<TournamentEnrollment[]> {
    const args = TournamentEnrollmentArgs.toFindManyOptions(inputArgs);
    return TournamentEnrollment.find(args);
  }

  @Query(() => [TournamentEnrollment], { description: 'Get current user enrollments for a tournament' })
  @UseGuards(PermGuard)
  async myTournamentEnrollments(
    @User() user: Player,
    @Args('tournamentEventId', { type: () => ID }) tournamentEventId: string,
  ): Promise<TournamentEnrollment[]> {
    // Find all sub-events for this tournament
    const subEvents = await TournamentSubEvent.find({
      where: { eventId: tournamentEventId },
    });

    if (subEvents.length === 0) {
      return [];
    }

    const subEventIds = subEvents.map((se) => se.id);

    // Find enrollments for current user in these sub-events
    return TournamentEnrollment.createQueryBuilder('enrollment')
      .where('enrollment.tournamentSubEventId IN (:...subEventIds)', { subEventIds })
      .andWhere('enrollment.playerId = :playerId', { playerId: user.id })
      .getMany();
  }

  @Query(() => [TournamentEnrollment], { description: 'Get enrollments for a specific sub-event' })
  @AllowAnonymous()
  async subEventEnrollments(
    @Args('subEventId', { type: () => ID }) subEventId: string,
    @Args('status', { type: () => EnrollmentStatus, nullable: true }) status?: EnrollmentStatus,
  ): Promise<TournamentEnrollment[]> {
    const where: any = { tournamentSubEventId: subEventId };
    if (status) {
      where.status = status;
    }

    return TournamentEnrollment.find({
      where,
      order: { createdAt: 'ASC' },
    });
  }

  @Query(() => [TournamentEnrollment], { description: 'Get waiting list for a sub-event' })
  @AllowAnonymous()
  async waitingList(
    @Args('subEventId', { type: () => ID }) subEventId: string,
  ): Promise<TournamentEnrollment[]> {
    return TournamentEnrollment.find({
      where: {
        tournamentSubEventId: subEventId,
        status: EnrollmentStatus.WAITING_LIST,
      },
      order: { waitingListPosition: 'ASC' },
    });
  }

  @Query(() => [TournamentEnrollment], { description: 'Get players looking for a partner in a sub-event' })
  @AllowAnonymous()
  async lookingForPartner(
    @Args('subEventId', { type: () => ID }) subEventId: string,
  ): Promise<TournamentEnrollment[]> {
    // Get the sub-event to check if it's doubles
    const subEvent = await TournamentSubEvent.findOne({
      where: { id: subEventId },
    });

    if (!subEvent) {
      throw new NotFoundException(`Sub-event with ID ${subEventId} not found`);
    }

    // Only return looking-for-partner for doubles events
    if (subEvent.gameType === GameType.S) {
      return [];
    }

    return TournamentEnrollment.find({
      where: {
        tournamentSubEventId: subEventId,
        status: EnrollmentStatus.PENDING,
        confirmedPartnerId: IsNull(),
      },
      order: { createdAt: 'ASC' },
    });
  }

  // ============ MUTATIONS ============

  @Mutation(() => TournamentEnrollment, { description: 'Enroll the current player in a tournament sub-event' })
  @UseGuards(PermGuard)
  async enrollInTournament(
    @User() user: Player,
    @Args('input') input: EnrollPlayerInput,
  ): Promise<TournamentEnrollment> {
    // Validate sub-event exists
    const subEvent = await TournamentSubEvent.findOne({
      where: { id: input.tournamentSubEventId },
      relations: ['tournamentEvent'],
    });

    if (!subEvent) {
      throw new NotFoundException(`Sub-event with ID ${input.tournamentSubEventId} not found`);
    }

    // Check tournament phase allows enrollment
    const tournamentEvent = subEvent.tournamentEvent;
    if (tournamentEvent) {
      if (tournamentEvent.phase !== TournamentPhase.ENROLLMENT_OPEN) {
        throw new BadRequestException('Enrollment is not currently open for this tournament');
      }

      // Check enrollment dates
      const now = new Date();
      if (tournamentEvent.enrollmentOpenDate && now < tournamentEvent.enrollmentOpenDate) {
        throw new BadRequestException('Enrollment has not started yet');
      }
      if (tournamentEvent.enrollmentCloseDate && now > tournamentEvent.enrollmentCloseDate) {
        throw new BadRequestException('Enrollment has closed');
      }
    }

    // Check if player is already enrolled
    const existingEnrollment = await TournamentEnrollment.findOne({
      where: {
        tournamentSubEventId: input.tournamentSubEventId,
        playerId: user.id,
      },
    });

    if (existingEnrollment) {
      throw new BadRequestException('You are already enrolled in this sub-event');
    }

    // Validate preferred partner exists if provided
    if (input.preferredPartnerId) {
      const partner = await Player.findOne({ where: { id: input.preferredPartnerId } });
      if (!partner) {
        throw new NotFoundException(`Player with ID ${input.preferredPartnerId} not found`);
      }

      // Prevent self-partnering
      if (input.preferredPartnerId === user.id) {
        throw new BadRequestException('You cannot select yourself as a partner');
      }
    }

    // Check if sub-event is full (need to add to waiting list)
    let status = EnrollmentStatus.PENDING;
    let waitingListPosition: number | undefined;

    if (subEvent.maxEntries) {
      const confirmedCount = await TournamentEnrollment.count({
        where: {
          tournamentSubEventId: input.tournamentSubEventId,
          status: EnrollmentStatus.CONFIRMED,
        },
      });

      // For doubles, count pairs (2 enrollments per entry)
      const isDoubles = subEvent.gameType !== GameType.S;
      const effectiveEntries = isDoubles ? Math.ceil(confirmedCount / 2) : confirmedCount;

      if (effectiveEntries >= subEvent.maxEntries) {
        if (subEvent.waitingListEnabled) {
          status = EnrollmentStatus.WAITING_LIST;
          // Get next waiting list position
          const lastWaiting = await TournamentEnrollment.findOne({
            where: {
              tournamentSubEventId: input.tournamentSubEventId,
              status: EnrollmentStatus.WAITING_LIST,
            },
            order: { waitingListPosition: 'DESC' },
          });
          waitingListPosition = (lastWaiting?.waitingListPosition ?? 0) + 1;
        } else {
          throw new BadRequestException('This sub-event is full and does not have a waiting list');
        }
      }
    }

    // For singles events, status is CONFIRMED immediately
    const isDoubles = subEvent.gameType !== GameType.S;
    if (!isDoubles && status === EnrollmentStatus.PENDING) {
      status = EnrollmentStatus.CONFIRMED;
    }

    // Create enrollment
    const enrollment = new TournamentEnrollment();
    enrollment.tournamentSubEventId = input.tournamentSubEventId;
    enrollment.playerId = user.id;
    enrollment.preferredPartnerId = input.preferredPartnerId;
    enrollment.notes = input.notes;
    enrollment.status = status;
    enrollment.waitingListPosition = waitingListPosition;
    enrollment.isGuest = false;

    await enrollment.save();

    // Try to match partners if doubles and not on waiting list
    if (isDoubles && status !== EnrollmentStatus.WAITING_LIST && input.preferredPartnerId) {
      await this.tryMatchPartners(enrollment);
    }

    return enrollment;
  }

  @Mutation(() => TournamentEnrollment, { description: 'Enroll a guest in a tournament sub-event' })
  @AllowAnonymous()
  async enrollGuest(
    @Args('input') input: EnrollGuestInput,
  ): Promise<TournamentEnrollment> {
    // Validate sub-event exists
    const subEvent = await TournamentSubEvent.findOne({
      where: { id: input.tournamentSubEventId },
      relations: ['tournamentEvent'],
    });

    if (!subEvent) {
      throw new NotFoundException(`Sub-event with ID ${input.tournamentSubEventId} not found`);
    }

    // Check if tournament allows guest enrollments
    const tournamentEvent = subEvent.tournamentEvent;
    if (tournamentEvent && !tournamentEvent.allowGuestEnrollments) {
      throw new ForbiddenException('This tournament does not allow guest enrollments');
    }

    // Check tournament phase allows enrollment
    if (tournamentEvent) {
      if (tournamentEvent.phase !== TournamentPhase.ENROLLMENT_OPEN) {
        throw new BadRequestException('Enrollment is not currently open for this tournament');
      }
    }

    // Check if sub-event is full
    let status = EnrollmentStatus.PENDING;
    let waitingListPosition: number | undefined;

    if (subEvent.maxEntries) {
      const confirmedCount = await TournamentEnrollment.count({
        where: {
          tournamentSubEventId: input.tournamentSubEventId,
          status: EnrollmentStatus.CONFIRMED,
        },
      });

      const isDoubles = subEvent.gameType !== GameType.S;
      const effectiveEntries = isDoubles ? Math.ceil(confirmedCount / 2) : confirmedCount;

      if (effectiveEntries >= subEvent.maxEntries) {
        if (subEvent.waitingListEnabled) {
          status = EnrollmentStatus.WAITING_LIST;
          const lastWaiting = await TournamentEnrollment.findOne({
            where: {
              tournamentSubEventId: input.tournamentSubEventId,
              status: EnrollmentStatus.WAITING_LIST,
            },
            order: { waitingListPosition: 'DESC' },
          });
          waitingListPosition = (lastWaiting?.waitingListPosition ?? 0) + 1;
        } else {
          throw new BadRequestException('This sub-event is full and does not have a waiting list');
        }
      }
    }

    // For singles events, status is CONFIRMED immediately
    const isDoubles = subEvent.gameType !== GameType.S;
    if (!isDoubles && status === EnrollmentStatus.PENDING) {
      status = EnrollmentStatus.CONFIRMED;
    }

    // Create enrollment
    const enrollment = new TournamentEnrollment();
    enrollment.tournamentSubEventId = input.tournamentSubEventId;
    enrollment.isGuest = true;
    enrollment.guestName = input.guestName;
    enrollment.guestEmail = input.guestEmail;
    enrollment.guestPhone = input.guestPhone;
    enrollment.preferredPartnerId = input.preferredPartnerId;
    enrollment.notes = input.notes;
    enrollment.status = status;
    enrollment.waitingListPosition = waitingListPosition;

    await enrollment.save();

    return enrollment;
  }

  @Mutation(() => TournamentEnrollment, { description: 'Update an enrollment' })
  @UseGuards(PermGuard)
  async updateEnrollment(
    @User() user: Player,
    @Args('enrollmentId', { type: () => ID }) enrollmentId: string,
    @Args('input') input: UpdateEnrollmentInput,
  ): Promise<TournamentEnrollment> {
    const enrollment = await TournamentEnrollment.findOne({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }

    // Check ownership or admin permission
    const isOwner = enrollment.playerId === user.id;
    const isAdmin = user.hasAnyPermission(['edit-any:tournament']);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to update this enrollment');
    }

    // Cannot update cancelled/withdrawn enrollments
    if (
      enrollment.status === EnrollmentStatus.CANCELLED ||
      enrollment.status === EnrollmentStatus.WITHDRAWN
    ) {
      throw new BadRequestException('Cannot update a cancelled or withdrawn enrollment');
    }

    // Validate preferred partner if provided
    if (input.preferredPartnerId) {
      const partner = await Player.findOne({ where: { id: input.preferredPartnerId } });
      if (!partner) {
        throw new NotFoundException(`Player with ID ${input.preferredPartnerId} not found`);
      }

      if (input.preferredPartnerId === enrollment.playerId) {
        throw new BadRequestException('You cannot select yourself as a partner');
      }
    }

    // Update fields
    if (input.preferredPartnerId !== undefined) {
      // If changing partner preference and already had a confirmed partner, reset
      if (enrollment.confirmedPartnerId && input.preferredPartnerId !== enrollment.confirmedPartnerId) {
        // Need to also update the partner's enrollment
        const partnerEnrollment = await TournamentEnrollment.findOne({
          where: {
            tournamentSubEventId: enrollment.tournamentSubEventId,
            playerId: enrollment.confirmedPartnerId,
          },
        });

        if (partnerEnrollment) {
          partnerEnrollment.confirmedPartnerId = undefined;
          partnerEnrollment.status = EnrollmentStatus.PENDING;
          await partnerEnrollment.save();
        }

        enrollment.confirmedPartnerId = undefined;
        enrollment.status = EnrollmentStatus.PENDING;
      }

      enrollment.preferredPartnerId = input.preferredPartnerId;
    }

    if (input.notes !== undefined) {
      enrollment.notes = input.notes;
    }

    await enrollment.save();

    // Try to match partners if doubles
    if (input.preferredPartnerId && enrollment.status === EnrollmentStatus.PENDING) {
      await this.tryMatchPartners(enrollment);
    }

    return enrollment;
  }

  @Mutation(() => TournamentEnrollment, { description: 'Cancel/withdraw from an enrollment' })
  @UseGuards(PermGuard)
  async cancelEnrollment(
    @User() user: Player,
    @Args('enrollmentId', { type: () => ID }) enrollmentId: string,
  ): Promise<TournamentEnrollment> {
    const enrollment = await TournamentEnrollment.findOne({
      where: { id: enrollmentId },
      relations: ['tournamentSubEvent'],
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }

    // Check ownership or admin permission
    const isOwner = enrollment.playerId === user.id;
    const isAdmin = user.hasAnyPermission(['edit-any:tournament']);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to cancel this enrollment');
    }

    // Already cancelled?
    if (
      enrollment.status === EnrollmentStatus.CANCELLED ||
      enrollment.status === EnrollmentStatus.WITHDRAWN
    ) {
      throw new BadRequestException('This enrollment is already cancelled');
    }

    // If had confirmed partner, update their enrollment
    if (enrollment.confirmedPartnerId) {
      const partnerEnrollment = await TournamentEnrollment.findOne({
        where: {
          tournamentSubEventId: enrollment.tournamentSubEventId,
          playerId: enrollment.confirmedPartnerId,
        },
      });

      if (partnerEnrollment) {
        partnerEnrollment.confirmedPartnerId = undefined;
        partnerEnrollment.status = EnrollmentStatus.PENDING;
        await partnerEnrollment.save();
      }
    }

    // Update status
    enrollment.status = isOwner ? EnrollmentStatus.WITHDRAWN : EnrollmentStatus.CANCELLED;
    enrollment.confirmedPartnerId = undefined;
    await enrollment.save();

    // If there's a waiting list, try to promote
    if (enrollment.tournamentSubEvent?.waitingListEnabled) {
      await this.tryPromoteFromWaitingList(enrollment.tournamentSubEventId);
    }

    return enrollment;
  }

  @Mutation(() => TournamentEnrollment, { description: 'Promote a player from the waiting list (organizer only)' })
  @UseGuards(PermGuard)
  async promoteFromWaitingList(
    @User() user: Player,
    @Args('enrollmentId', { type: () => ID }) enrollmentId: string,
  ): Promise<TournamentEnrollment> {
    // Check admin permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to promote players from waiting list');
    }

    const enrollment = await TournamentEnrollment.findOne({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }

    if (enrollment.status !== EnrollmentStatus.WAITING_LIST) {
      throw new BadRequestException('This enrollment is not on the waiting list');
    }

    // Update status
    enrollment.status = EnrollmentStatus.PENDING;
    enrollment.waitingListPosition = undefined;
    await enrollment.save();

    // Try to match partners
    if (enrollment.preferredPartnerId) {
      await this.tryMatchPartners(enrollment);
    }

    // Update waiting list positions
    await this.reorderWaitingList(enrollment.tournamentSubEventId);

    return enrollment;
  }

  // ============ RESOLVE FIELDS ============

  @ResolveField(() => TournamentSubEvent, { nullable: true })
  async tournamentSubEvent(@Parent() { tournamentSubEventId }: TournamentEnrollment): Promise<TournamentSubEvent | null> {
    if (!tournamentSubEventId) return null;
    return TournamentSubEvent.findOne({ where: { id: tournamentSubEventId } });
  }

  @ResolveField(() => Player, { nullable: true })
  async player(@Parent() { playerId }: TournamentEnrollment): Promise<Player | null> {
    if (!playerId) return null;
    return Player.findOne({ where: { id: playerId } });
  }

  @ResolveField(() => Player, { nullable: true })
  async preferredPartner(@Parent() { preferredPartnerId }: TournamentEnrollment): Promise<Player | null> {
    if (!preferredPartnerId) return null;
    return Player.findOne({ where: { id: preferredPartnerId } });
  }

  @ResolveField(() => Player, { nullable: true })
  async confirmedPartner(@Parent() { confirmedPartnerId }: TournamentEnrollment): Promise<Player | null> {
    if (!confirmedPartnerId) return null;
    return Player.findOne({ where: { id: confirmedPartnerId } });
  }

  // ============ HELPER METHODS ============

  /**
   * Try to match two players who have named each other as preferred partners
   */
  private async tryMatchPartners(enrollment: TournamentEnrollment): Promise<void> {
    if (!enrollment.preferredPartnerId || !enrollment.playerId) {
      return;
    }

    // Find partner's enrollment
    const partnerEnrollment = await TournamentEnrollment.findOne({
      where: {
        tournamentSubEventId: enrollment.tournamentSubEventId,
        playerId: enrollment.preferredPartnerId,
      },
    });

    if (!partnerEnrollment) {
      return; // Partner hasn't enrolled yet
    }

    // Check if partner has named this player as their preferred partner (mutual preference)
    if (partnerEnrollment.preferredPartnerId === enrollment.playerId) {
      // Mutual match! Confirm partnership
      enrollment.confirmedPartnerId = enrollment.preferredPartnerId;
      enrollment.status = EnrollmentStatus.CONFIRMED;
      await enrollment.save();

      partnerEnrollment.confirmedPartnerId = enrollment.playerId;
      partnerEnrollment.status = EnrollmentStatus.CONFIRMED;
      await partnerEnrollment.save();
    }
  }

  /**
   * Try to promote players from waiting list when a spot opens
   */
  private async tryPromoteFromWaitingList(subEventId: string): Promise<void> {
    const subEvent = await TournamentSubEvent.findOne({
      where: { id: subEventId },
    });

    if (!subEvent || !subEvent.maxEntries) {
      return;
    }

    // Count current confirmed entries
    const confirmedCount = await TournamentEnrollment.count({
      where: {
        tournamentSubEventId: subEventId,
        status: EnrollmentStatus.CONFIRMED,
      },
    });

    const isDoubles = subEvent.gameType !== GameType.S;
    const effectiveEntries = isDoubles ? Math.ceil(confirmedCount / 2) : confirmedCount;

    if (effectiveEntries >= subEvent.maxEntries) {
      return; // Still full
    }

    // Get first person on waiting list
    const nextInLine = await TournamentEnrollment.findOne({
      where: {
        tournamentSubEventId: subEventId,
        status: EnrollmentStatus.WAITING_LIST,
      },
      order: { waitingListPosition: 'ASC' },
    });

    if (nextInLine) {
      nextInLine.status = EnrollmentStatus.PENDING;
      nextInLine.waitingListPosition = undefined;
      await nextInLine.save();

      // Try to match partners
      if (nextInLine.preferredPartnerId) {
        await this.tryMatchPartners(nextInLine);
      }

      // Reorder remaining waiting list
      await this.reorderWaitingList(subEventId);
    }
  }

  /**
   * Reorder waiting list positions after a change
   */
  private async reorderWaitingList(subEventId: string): Promise<void> {
    const waitingList = await TournamentEnrollment.find({
      where: {
        tournamentSubEventId: subEventId,
        status: EnrollmentStatus.WAITING_LIST,
      },
      order: { waitingListPosition: 'ASC' },
    });

    for (let i = 0; i < waitingList.length; i++) {
      waitingList[i].waitingListPosition = i + 1;
      await waitingList[i].save();
    }
  }
}
