import { Injectable, BadRequestException } from '@nestjs/common';
import {
  TournamentEnrollment,
} from '@app/models';
import { EnrollmentStatus } from '@app/models-enum';
import { EnrollmentCartService } from './enrollment-cart.service';

@Injectable()
export class EnrollmentService {
  constructor(
    private cartService: EnrollmentCartService,
  ) {}

  /**
   * Submit enrollment cart - converts cart to actual enrollments
   * Simple for loop creating enrollments directly
   */
  async submitCart(cartId: string): Promise<TournamentEnrollment[]> {
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

    // Simple for loop - create enrollments directly
    const enrollments: TournamentEnrollment[] = [];
    for (const item of cart.items) {
      // Direct database operation - create enrollment
      const enrollment = new TournamentEnrollment();
      enrollment.tournamentSubEventId = item.tournamentSubEventId;
      enrollment.playerId = cart.playerId;
      enrollment.preferredPartnerId = item.preferredPartnerId;
      enrollment.notes = item.notes;
      enrollment.status = EnrollmentStatus.PENDING;
      enrollment.isGuest = false;
      enrollment.sessionId = cart.id;

      await enrollment.save();
      enrollments.push(enrollment);
    }

    // Mark cart as submitted
    await this.cartService.markAsSubmitted(cartId);

    return enrollments;
  }

}
