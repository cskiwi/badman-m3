import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LessThan, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  EnrollmentSession,
  EnrollmentSessionItem,
  EnrollmentSessionStatus,
  ItemValidationStatus,
  TournamentSubEvent,
} from '@app/models';

export interface CartItemInput {
  subEventId: string;
  preferredPartnerId?: string;
  notes?: string;
  guestInfo?: {
    name: string;
    email: string;
    phone?: string;
  };
}

@Injectable()
export class EnrollmentCartService {
  /**
   * Find or create an active enrollment cart for a user
   */
  async findOrCreateCart(
    tournamentId: string,
    playerId?: string,
    sessionKey?: string,
  ): Promise<EnrollmentSession> {
    // Try to find existing active cart
    const whereClause: any = {
      tournamentEventId: tournamentId,
      status: EnrollmentSessionStatus.PENDING,
    };

    if (playerId) {
      whereClause.playerId = playerId;
    } else if (sessionKey) {
      whereClause.sessionKey = sessionKey;
    }

    let cart = await EnrollmentSession.findOne({
      where: whereClause,
      relations: ['items', 'items.tournamentSubEvent'],
    });

    if (!cart) {
      // Create new cart
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

      cart = EnrollmentSession.create({
        tournamentEventId: tournamentId,
        playerId,
        sessionKey: sessionKey || uuidv4(),
        status: EnrollmentSessionStatus.PENDING,
        expiresAt,
        totalSubEvents: 0,
      });

      await EnrollmentSession.save(cart);
    }

    return cart;
  }

  /**
   * Add items to enrollment cart
   */
  async addToCart(
    tournamentId: string,
    playerId: string | undefined,
    sessionKey: string | undefined,
    items: CartItemInput[],
  ): Promise<EnrollmentSession> {
    const cart = await this.findOrCreateCart(tournamentId, playerId, sessionKey);

    // Load existing items to avoid duplicates
    const existingItems = await EnrollmentSessionItem.find({
      where: { sessionId: cart.id },
    });

    const existingSubEventIds = new Set(
      existingItems.map((item) => item.tournamentSubEventId),
    );

    // Filter out items already in cart
    const newItems = items.filter(
      (item) => !existingSubEventIds.has(item.subEventId),
    );

    if (newItems.length === 0) {
      return cart;
    }

    // Validate all sub-events exist
    const subEventIds = newItems.map((item) => item.subEventId);
    const subEvents = await TournamentSubEvent.findByIds(subEventIds);

    if (subEvents.length !== newItems.length) {
      throw new BadRequestException('One or more sub-events not found');
    }

    // Create new cart items
    const cartItems = newItems.map((item) =>
      EnrollmentSessionItem.create({
        sessionId: cart.id,
        tournamentSubEventId: item.subEventId,
        preferredPartnerId: item.preferredPartnerId,
        notes: item.notes,
        isGuestEnrollment: !!item.guestInfo,
        guestName: item.guestInfo?.name,
        guestEmail: item.guestInfo?.email,
        guestPhone: item.guestInfo?.phone,
        validationStatus: ItemValidationStatus.PENDING,
      }),
    );

    await EnrollmentSessionItem.save(cartItems);

    // Update cart totals
    cart.totalSubEvents = existingItems.length + newItems.length;
    await EnrollmentSession.save(cart);

    // Reload with relations
    return EnrollmentSession.findOne({
      where: { id: cart.id },
      relations: ['items', 'items.tournamentSubEvent', 'items.preferredPartner'],
    }) as Promise<EnrollmentSession>;
  }

  /**
   * Remove items from cart
   */
  async removeFromCart(
    cartId: string,
    subEventIds: string[],
  ): Promise<EnrollmentSession> {
    const cart = await EnrollmentSession.findOne({
      where: { id: cartId },
      relations: ['items'],
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.status !== EnrollmentSessionStatus.PENDING) {
      throw new BadRequestException('Cannot modify a submitted or expired cart');
    }

    // Delete items
    await EnrollmentSessionItem.delete({
      sessionId: cartId,
      tournamentSubEventId: In(subEventIds),
    });

    // Update totals
    const remainingItems = await EnrollmentSessionItem.count({
      where: { sessionId: cartId },
    });

    cart.totalSubEvents = remainingItems;
    await EnrollmentSession.save(cart);

    // Reload with relations
    return EnrollmentSession.findOne({
      where: { id: cartId },
      relations: ['items', 'items.tournamentSubEvent', 'items.preferredPartner'],
    }) as Promise<EnrollmentSession>;
  }

  /**
   * Clear entire cart
   */
  async clearCart(cartId: string): Promise<boolean> {
    const cart = await EnrollmentSession.findOne({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.status !== EnrollmentSessionStatus.PENDING) {
      throw new BadRequestException('Cannot clear a submitted or expired cart');
    }

    // Delete all items (cascade will handle this)
    await EnrollmentSessionItem.delete({ sessionId: cartId });

    // Update cart
    cart.totalSubEvents = 0;
    await EnrollmentSession.save(cart);

    return true;
  }

  /**
   * Get cart by ID
   */
  async getCart(cartId: string): Promise<EnrollmentSession> {
    const cart = await EnrollmentSession.findOne({
      where: { id: cartId },
      relations: [
        'items',
        'items.tournamentSubEvent',
        'items.preferredPartner',
        'tournamentEvent',
      ],
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return cart;
  }

  /**
   * Get cart by session key or player ID
   */
  async getCartByIdentifier(
    tournamentId: string,
    playerId?: string,
    sessionKey?: string,
  ): Promise<EnrollmentSession | null> {
    const whereClause: any = {
      tournamentEventId: tournamentId,
      status: EnrollmentSessionStatus.PENDING,
    };

    if (playerId) {
      whereClause.playerId = playerId;
    } else if (sessionKey) {
      whereClause.sessionKey = sessionKey;
    } else {
      return null;
    }

    return EnrollmentSession.findOne({
      where: whereClause,
      relations: [
        'items',
        'items.tournamentSubEvent',
        'items.preferredPartner',
        'tournamentEvent',
      ],
    });
  }

  /**
   * Mark cart as submitted
   */
  async markAsSubmitted(cartId: string): Promise<void> {
    await EnrollmentSession.update(cartId, {
      status: EnrollmentSessionStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  /**
   * Clean up expired carts
   * This should be called by a scheduled job
   */
  async cleanupExpiredCarts(): Promise<number> {
    const expiredCarts = await EnrollmentSession.find({
      where: {
        status: EnrollmentSessionStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
    });

    if (expiredCarts.length === 0) {
      return 0;
    }

    // Mark as expired
    await EnrollmentSession.update(
      expiredCarts.map((c) => c.id),
      { status: EnrollmentSessionStatus.EXPIRED },
    );

    return expiredCarts.length;
  }

  /**
   * Update cart item validation status
   */
  async updateItemValidation(
    itemId: string,
    validationStatus: ItemValidationStatus,
    validationErrors?: any,
  ): Promise<void> {
    await EnrollmentSessionItem.update(itemId, {
      validationStatus,
      validationErrors: validationErrors ? JSON.stringify(validationErrors) : undefined,
    });
  }
}
