import { Resolver, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards, BadRequestException } from '@nestjs/common';
import {
  TournamentEnrollment,
  EnrollmentSession,
  Player,
} from '@app/models';
import { EnrollmentStatus } from '@app/models-enum';
import { User, PermGuard, AllowAnonymous } from '@app/backend-authorization';
import {
  CartItemInput,
  AddToCartInput,
} from '../../../inputs/enrollment.input';
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
   * Enroll in a single sub-event - simple direct enrollment
   */
  @Mutation(() => TournamentEnrollment, { name: 'enrollInSubEvent' })
  @UseGuards(PermGuard)
  async enrollInSubEvent(
    @Args('subEventId', { type: () => ID }) subEventId: string,
    @Args('preferredPartnerId', { type: () => ID, nullable: true }) preferredPartnerId?: string,
    @Args('notes', { type: () => String, nullable: true }) notes?: string,
    @User() user?: Player,
  ): Promise<TournamentEnrollment> {
    if (!user?.id) {
      throw new BadRequestException('Player profile required');
    }

    // Simple direct enrollment creation - DB → Model → GraphQL pattern
    const enrollment = new TournamentEnrollment();
    enrollment.tournamentSubEventId = subEventId;
    enrollment.playerId = user.id;
    enrollment.preferredPartnerId = preferredPartnerId;
    enrollment.notes = notes;
    enrollment.status = EnrollmentStatus.PENDING;
    enrollment.isGuest = false;

    return await enrollment.save();
  }

  /**
   * Submit enrollment cart - simple for loop approach
   */
  @Mutation(() => [TournamentEnrollment], { name: 'submitEnrollmentCart' })
  @UseGuards(PermGuard)
  async submitEnrollmentCart(
    @Args('cartId', { type: () => ID }) cartId: string,
    @User() user: Player,
  ): Promise<TournamentEnrollment[]> {
    if (!user?.id) {
      throw new BadRequestException('Player profile required');
    }

    return this.enrollmentService.submitCart(cartId);
  }
}
