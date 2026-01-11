import { Resolver, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards, BadRequestException } from '@nestjs/common';
import {
  TournamentEnrollment,
  EnrollmentSession,
  Player,
} from '@app/models';
import { User, PermGuard, AllowAnonymous } from '@app/backend-authorization';
import {
  CartItemInput,
  BulkEnrollmentInput,
  AddToCartInput,
} from '../../../inputs/enrollment.input';
import { BulkEnrollmentResult } from '../../../inputs/enrollment-output';
import { EnrollmentService } from '../../../services/tournament/enrollment.service';
import { EnrollmentCartService } from '../../../services/tournament/enrollment-cart.service';

@Resolver()
export class EnrollmentMutationsResolver {
  constructor(
    private enrollmentService: EnrollmentService,
    private cartService: EnrollmentCartService,
  ) {}

  /**
   * Add items to enrollment cart
   */
  @Mutation(() => EnrollmentSession, { name: 'addToEnrollmentCart' })
  @UseGuards(PermGuard)
  @AllowAnonymous()
  async addToEnrollmentCart(
    @Args('input', { type: () => AddToCartInput }) input: AddToCartInput,
    @User() user?: Player,
  ): Promise<EnrollmentSession> {
    return this.cartService.addToCart(
      input.tournamentId,
      user?.id,
      input.sessionId,
      input.items,
    );
  }

  /**
   * Remove items from enrollment cart
   */
  @Mutation(() => EnrollmentSession, { name: 'removeFromEnrollmentCart' })
  async removeFromEnrollmentCart(
    @Args('cartId', { type: () => ID }) cartId: string,
    @Args('subEventIds', { type: () => [ID] }) subEventIds: string[],
  ): Promise<EnrollmentSession> {
    return this.cartService.removeFromCart(cartId, subEventIds);
  }

  /**
   * Clear entire cart
   */
  @Mutation(() => Boolean, { name: 'clearEnrollmentCart' })
  async clearEnrollmentCart(
    @Args('cartId', { type: () => ID }) cartId: string,
  ): Promise<boolean> {
    return this.cartService.clearCart(cartId);
  }

  /**
   * Submit enrollment cart
   */
  @Mutation(() => BulkEnrollmentResult, { name: 'submitEnrollmentCart' })
  @UseGuards(PermGuard)
  async submitEnrollmentCart(
    @Args('cartId', { type: () => ID }) cartId: string,
    @User() user: Player,
  ): Promise<BulkEnrollmentResult> {
    if (!user?.id) {
      throw new BadRequestException('Player profile required');
    }

    return this.enrollmentService.submitCart(cartId);
  }

  /**
   * Direct bulk enrollment without cart (shortcut for simple cases)
   */
  @Mutation(() => BulkEnrollmentResult, { name: 'bulkEnrollInTournament' })
  @UseGuards(PermGuard)
  async bulkEnrollInTournament(
    @Args('input', { type: () => BulkEnrollmentInput }) input: BulkEnrollmentInput,
    @User() user: Player,
  ): Promise<BulkEnrollmentResult> {
    if (!user?.id) {
      throw new BadRequestException('Player profile required');
    }

    const partnerMap = new Map(
      input.partnerPreferences?.map((p: { subEventId: string; preferredPartnerId: string }) => [
        p.subEventId,
        p.preferredPartnerId,
      ]) || [],
    );

    return this.enrollmentService.bulkEnroll(
      input.tournamentId,
      user.id,
      input.subEventIds,
      partnerMap,
      input.notes,
    );
  }

  /**
   * Cancel enrollment
   */
  @Mutation(() => TournamentEnrollment, { name: 'cancelTournamentEnrollment' })
  @UseGuards(PermGuard)
  async cancelTournamentEnrollment(
    @Args('enrollmentId', { type: () => ID }) enrollmentId: string,
    @User() user: Player,
  ): Promise<TournamentEnrollment> {
    // TODO: Add authorization check to ensure user owns this enrollment
    return this.enrollmentService.cancelEnrollment(enrollmentId);
  }
}
