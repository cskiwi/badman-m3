import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  TournamentEnrollment,
  TournamentSubEvent,
  EnrollmentSession,
  Player,
} from '@app/models';
import { EnrollmentStatus } from '@app/models-enum';
import { EnrollmentValidationService } from './enrollment-validation.service';
import { EnrollmentCapacityService } from './enrollment-capacity.service';
import { EnrollmentCartService } from './enrollment-cart.service';

export interface BulkEnrollmentResult {
  success: boolean;
  enrollments: TournamentEnrollment[];
  errors: BulkEnrollmentError[];
  partialSuccess: boolean;
}

export interface BulkEnrollmentError {
  subEventId: string;
  subEventName: string;
  errorMessage: string;
}

@Injectable()
export class EnrollmentService {
  constructor(
    private validationService: EnrollmentValidationService,
    private capacityService: EnrollmentCapacityService,
    private cartService: EnrollmentCartService,
    private dataSource: DataSource,
  ) {}

  /**
   * Bulk enroll a player in multiple sub-events
   * Uses atomic transaction - all or nothing
   */
  async bulkEnroll(
    tournamentId: string,
    playerId: string,
    subEventIds: string[],
    partnerPreferences: Map<string, string>,
    notes?: string,
    sessionId?: string,
  ): Promise<BulkEnrollmentResult> {
    // 1. Pre-validate all enrollments
    const validation = await this.validationService.validateBulkEnrollment(
      tournamentId,
      subEventIds,
      playerId,
      partnerPreferences,
    );

    if (!validation.valid) {
      return {
        success: false,
        enrollments: [],
        errors: validation.errors.map((e) => ({
          subEventId: e.subEventId,
          subEventName: e.subEventName,
          errorMessage: e.message,
        })),
        partialSuccess: false,
      };
    }

    // 2. Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const enrollments: TournamentEnrollment[] = [];

      for (const subEventId of subEventIds) {
        const enrollment = await this.createSingleEnrollment(
          subEventId,
          playerId,
          partnerPreferences.get(subEventId),
          notes,
          sessionId,
          queryRunner.manager,
        );
        enrollments.push(enrollment);
      }

      // 3. Attempt partner matching across all enrollments
      await this.attemptPartnerMatching(enrollments, queryRunner.manager);

      await queryRunner.commitTransaction();

      return {
        success: true,
        enrollments,
        errors: [],
        partialSuccess: false,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        `Bulk enrollment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Create a single enrollment (internal method used by bulk enroll)
   */
  private async createSingleEnrollment(
    subEventId: string,
    playerId: string,
    preferredPartnerId: string | undefined,
    notes: string | undefined,
    sessionId: string | undefined,
    manager: EntityManager,
  ): Promise<TournamentEnrollment> {
    const subEvent = await manager.findOne(TournamentSubEvent, {
      where: { id: subEventId },
    });

    if (!subEvent) {
      throw new Error('Sub-event not found');
    }

    // Check capacity
    const capacity = await this.capacityService.getCapacity(subEventId);

    let status: EnrollmentStatus;
    let waitingListPosition: number | undefined;

    if (capacity.isFull) {
      if (subEvent.waitingListEnabled) {
        status = EnrollmentStatus.WAITING_LIST;
        waitingListPosition = await this.capacityService.getNextWaitingListPosition(
          subEventId,
        );
      } else {
        throw new BadRequestException('Event is full and has no waiting list');
      }
    } else {
      // Singles: immediate confirmation
      // Doubles: pending until partner confirms
      status =
        subEvent.gameType === 'S'
          ? EnrollmentStatus.CONFIRMED
          : EnrollmentStatus.PENDING;
    }

    // Override status if approval required
    if (subEvent.requiresApproval && status === EnrollmentStatus.CONFIRMED) {
      status = EnrollmentStatus.PENDING;
    }

    const enrollment = manager.create(TournamentEnrollment, {
      tournamentSubEventId: subEventId,
      playerId,
      status,
      preferredPartnerId,
      waitingListPosition,
      notes,
      sessionId,
      enrollmentSource: sessionId ? 'PUBLIC_FORM' : 'MANUAL',
      requiresApproval: subEvent.requiresApproval,
    });

    return await manager.save(enrollment);
  }

  /**
   * Attempt to automatically match partners for doubles events
   */
  private async attemptPartnerMatching(
    enrollments: TournamentEnrollment[],
    manager: EntityManager,
  ): Promise<void> {
    for (const enrollment of enrollments) {
      if (
        !enrollment.preferredPartnerId ||
        enrollment.status !== EnrollmentStatus.PENDING
      ) {
        continue;
      }

      // Check if preferred partner also enrolled with mutual preference
      const partnerEnrollment = await manager.findOne(TournamentEnrollment, {
        where: {
          tournamentSubEventId: enrollment.tournamentSubEventId,
          playerId: enrollment.preferredPartnerId,
          preferredPartnerId: enrollment.playerId,
          status: EnrollmentStatus.PENDING,
        },
      });

      if (partnerEnrollment) {
        // Mutual preference found! Confirm both
        enrollment.status = EnrollmentStatus.CONFIRMED;
        enrollment.confirmedPartnerId = partnerEnrollment.playerId;

        partnerEnrollment.status = EnrollmentStatus.CONFIRMED;
        partnerEnrollment.confirmedPartnerId = enrollment.playerId;

        await manager.save([enrollment, partnerEnrollment]);
      }
    }
  }

  /**
   * Submit enrollment cart - converts cart to actual enrollments
   */
  async submitCart(cartId: string): Promise<BulkEnrollmentResult> {
    const cart = await this.cartService.getCart(cartId);

    if (!cart) {
      throw new BadRequestException('Cart not found');
    }

    if (cart.status !== 'PENDING') {
      throw new BadRequestException('Cart is not active');
    }

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    if (!cart.playerId) {
      throw new BadRequestException('Player ID is required for enrollment');
    }

    // Extract data from cart
    const subEventIds = cart.items.map((item) => item.tournamentSubEventId);
    const partnerPreferences = new Map(
      cart.items
        .filter((item) => item.preferredPartnerId)
        .map((item) => [item.tournamentSubEventId, item.preferredPartnerId!]),
    );

    // Perform bulk enrollment
    const result = await this.bulkEnroll(
      cart.tournamentEventId!,
      cart.playerId,
      subEventIds,
      partnerPreferences,
      undefined,
      cart.id,
    );

    // Mark cart as submitted if successful
    if (result.success) {
      await this.cartService.markAsSubmitted(cartId);
    }

    return result;
  }

  /**
   * Cancel an enrollment and potentially promote from waiting list
   */
  async cancelEnrollment(
    enrollmentId: string,
  ): Promise<TournamentEnrollment> {
    const enrollment = await TournamentEnrollment.findOne({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new BadRequestException('Enrollment not found');
    }

    if (
      enrollment.status === EnrollmentStatus.CANCELLED ||
      enrollment.status === EnrollmentStatus.WITHDRAWN
    ) {
      throw new BadRequestException('Enrollment is already cancelled');
    }

    const wasConfirmed = enrollment.status === EnrollmentStatus.CONFIRMED;

    // Update status
    enrollment.status = EnrollmentStatus.CANCELLED;
    enrollment.cancelledAt = new Date();
    await TournamentEnrollment.save(enrollment);

    // If confirmed enrollment was cancelled, try to promote from waiting list
    if (wasConfirmed) {
      await this.capacityService.promoteFromWaitingList(
        enrollment.tournamentSubEventId,
      );
    }

    // If this was a doubles enrollment with a confirmed partner, update partner
    if (enrollment.confirmedPartnerId) {
      const partner = await TournamentEnrollment.findOne({
        where: {
          tournamentSubEventId: enrollment.tournamentSubEventId,
          playerId: enrollment.confirmedPartnerId,
        },
      });

      if (partner) {
        partner.confirmedPartnerId = undefined;
        partner.status = EnrollmentStatus.PENDING;
        await TournamentEnrollment.save(partner);
      }
    }

    return enrollment;
  }

  /**
   * Get user's enrollments for a tournament
   */
  async getMyEnrollments(
    tournamentId: string,
    playerId: string,
  ): Promise<TournamentEnrollment[]> {
    return TournamentEnrollment.find({
      where: {
        playerId,
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
   * Get all enrollments for a sub-event
   */
  async getEnrollmentsForSubEvent(
    subEventId: string,
  ): Promise<TournamentEnrollment[]> {
    return TournamentEnrollment.find({
      where: { tournamentSubEventId: subEventId },
      relations: ['player', 'preferredPartner', 'confirmedPartner'],
      order: { createdAt: 'ASC' },
    });
  }
}
