import { Injectable } from '@nestjs/common';
import { In, Not } from 'typeorm';
import {
  TournamentSubEvent,
  TournamentEnrollment,
  Player,
} from '@app/models';
import { EnrollmentStatus } from '@app/models-enum';

export interface EnrollmentEligibility {
  eligible: boolean;
  reasons: string[];
  hasInvitation: boolean;
  meetsLevelRequirement: boolean;
  isAlreadyEnrolled: boolean;
  hasCapacity: boolean;
  isWithinEnrollmentWindow: boolean;
}

export interface CartValidationResult {
  valid: boolean;
  errors: CartValidationError[];
  warnings: string[];
}

export interface CartValidationError {
  subEventId: string;
  subEventName: string;
  errorType: string;
  message: string;
}

@Injectable()
export class EnrollmentValidationService {
  /**
   * Check if a player is eligible to enroll in a specific sub-event
   */
  async checkEligibility(
    subEventId: string,
    playerId: string,
  ): Promise<EnrollmentEligibility> {
    const subEvent = await TournamentSubEvent.findOne({
      where: { id: subEventId },
      relations: ['tournamentEvent'],
    });

    if (!subEvent) {
      return {
        eligible: false,
        reasons: ['Sub-event not found'],
        hasInvitation: false,
        meetsLevelRequirement: false,
        isAlreadyEnrolled: false,
        hasCapacity: false,
        isWithinEnrollmentWindow: false,
      };
    }

    const reasons: string[] = [];
    const result = {
      eligible: true,
      hasInvitation: true,
      meetsLevelRequirement: true,
      isAlreadyEnrolled: false,
      hasCapacity: true,
      isWithinEnrollmentWindow: true,
    };

    // 1. Check enrollment phase
    const validPhases = ['OPEN', 'WAITLIST_ONLY'];
    if (!validPhases.includes(subEvent.enrollmentPhase)) {
      result.eligible = false;
      result.isWithinEnrollmentWindow = false;
      reasons.push('Enrollment is not currently open for this event');
    }

    // 2. Check enrollment window dates
    const now = new Date();
    if (subEvent.enrollmentOpenDate && now < subEvent.enrollmentOpenDate) {
      result.eligible = false;
      result.isWithinEnrollmentWindow = false;
      reasons.push(
        `Enrollment opens on ${subEvent.enrollmentOpenDate.toLocaleDateString()}`,
      );
    }
    if (subEvent.enrollmentCloseDate && now > subEvent.enrollmentCloseDate) {
      result.eligible = false;
      result.isWithinEnrollmentWindow = false;
      reasons.push('Enrollment has closed for this event');
    }

    // Fallback to tournament-level dates if per-event dates not set
    if (!subEvent.enrollmentOpenDate && subEvent.tournamentEvent?.enrollmentOpenDate) {
      if (now < subEvent.tournamentEvent.enrollmentOpenDate) {
        result.eligible = false;
        result.isWithinEnrollmentWindow = false;
        reasons.push('Tournament enrollment has not opened yet');
      }
    }
    if (!subEvent.enrollmentCloseDate && subEvent.tournamentEvent?.enrollmentCloseDate) {
      if (now > subEvent.tournamentEvent.enrollmentCloseDate) {
        result.eligible = false;
        result.isWithinEnrollmentWindow = false;
        reasons.push('Tournament enrollment has closed');
      }
    }

    // 3. Check level requirements
    if (subEvent.minLevel || subEvent.maxLevel) {
      const player = await Player.findOne({ where: { id: playerId } });
      if (player) {
        const playerLevel =
          subEvent.gameType === 'S' ? (player as any).levelSingle : (player as any).levelDouble;

        if (subEvent.minLevel && playerLevel < subEvent.minLevel) {
          result.eligible = false;
          result.meetsLevelRequirement = false;
          reasons.push(`Minimum level ${subEvent.minLevel} required`);
        }
        if (subEvent.maxLevel && playerLevel > subEvent.maxLevel) {
          result.eligible = false;
          result.meetsLevelRequirement = false;
          reasons.push(`Maximum level ${subEvent.maxLevel} exceeded`);
        }
      }
    }

    // 4. Check if already enrolled
    const existingEnrollment = await TournamentEnrollment.findOne({
      where: {
        tournamentSubEventId: subEventId,
        playerId,
        status: Not(In([EnrollmentStatus.CANCELLED, EnrollmentStatus.WITHDRAWN])),
      },
    });

    if (existingEnrollment) {
      result.eligible = false;
      result.isAlreadyEnrolled = true;
      reasons.push('You are already enrolled in this event');
    }

    // 5. Check capacity
    if (subEvent.maxEntries) {
      const isFull = subEvent.currentEnrollmentCount >= subEvent.maxEntries;

      if (isFull && subEvent.enrollmentPhase !== 'WAITLIST_ONLY') {
        if (!subEvent.waitingListEnabled) {
          result.eligible = false;
          result.hasCapacity = false;
          reasons.push('This event is full and has no waiting list');
        }
      }
    }

    return {
      reasons,
      ...result,
    };
  }

  /**
   * Validate bulk enrollment for multiple sub-events
   */
  async validateBulkEnrollment(
    tournamentId: string,
    subEventIds: string[],
    playerId: string,
    partnerPreferences: Map<string, string>,
  ): Promise<CartValidationResult> {
    const errors: CartValidationError[] = [];
    const warnings: string[] = [];

    // Load all sub-events at once
    const subEvents = await TournamentSubEvent.find({
      where: { id: In(subEventIds), eventId: tournamentId },
    });

    if (subEvents.length !== subEventIds.length) {
      const foundIds = new Set(subEvents.map((se) => se.id));
      const missingIds = subEventIds.filter((id) => !foundIds.has(id));

      missingIds.forEach((id) => {
        errors.push({
          subEventId: id,
          subEventName: 'Unknown',
          errorType: 'NOT_FOUND',
          message: 'Sub-event not found',
        });
      });
    }

    // Check eligibility for all sub-events in parallel
    const eligibilityChecks = await Promise.all(
      subEvents.map((se) => this.checkEligibility(se.id, playerId)),
    );

    subEvents.forEach((subEvent, index) => {
      const eligibility = eligibilityChecks[index];

      if (!eligibility.eligible) {
        eligibility.reasons.forEach((reason) => {
          errors.push({
            subEventId: subEvent.id,
            subEventName: subEvent.name || 'Unknown',
            errorType: this.mapReasonToErrorType(reason),
            message: reason,
          });
        });
      }

      // Validate partner preferences
      const partnerId = partnerPreferences.get(subEvent.id);
      if (partnerId) {
        if (partnerId === playerId) {
          errors.push({
            subEventId: subEvent.id,
            subEventName: subEvent.name || 'Unknown',
            errorType: 'INVALID_PARTNER',
            message: 'You cannot partner with yourself',
          });
        }

        // Check if partner exists (async validation would happen in mutation)
        if (subEvent.gameType !== 'D' && subEvent.gameType !== 'MX') {
          warnings.push(
            `Partner preference for ${subEvent.name} will be ignored (not a doubles event)`,
          );
        }
      }
    });

    // Cross-event validations
    // Check for time conflicts (if sub-events have scheduled times)
    // Check for same event type conflicts (e.g., can't enroll in both Men's and Women's singles)
    const eventTypeConflicts = this.checkEventTypeConflicts(subEvents);
    if (eventTypeConflicts.length > 0) {
      warnings.push(...eventTypeConflicts);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Map eligibility reason to error type
   */
  private mapReasonToErrorType(reason: string): string {
    if (reason.includes('not open') || reason.includes('closed')) {
      return 'ENROLLMENT_CLOSED';
    }
    if (reason.includes('level')) {
      return 'LEVEL_REQUIREMENT_NOT_MET';
    }
    if (reason.includes('already enrolled')) {
      return 'ALREADY_ENROLLED';
    }
    if (reason.includes('full')) {
      return 'CAPACITY_FULL';
    }
    if (reason.includes('invitation')) {
      return 'INVITATION_REQUIRED';
    }
    return 'NOT_ELIGIBLE';
  }

  /**
   * Check for event type conflicts
   */
  private checkEventTypeConflicts(subEvents: TournamentSubEvent[]): string[] {
    const warnings: string[] = [];

    // Group by game type
    const singlesEvents = subEvents.filter((se) => se.gameType === 'S');
    const doublesEvents = subEvents.filter((se) => se.gameType === 'D');
    const mixedEvents = subEvents.filter((se) => se.gameType === 'MX');

    // Warn if enrolling in multiple singles events
    if (singlesEvents.length > 1) {
      const eventNames = singlesEvents.map((se) => se.name).join(', ');
      warnings.push(
        `You are enrolling in multiple singles events: ${eventNames}. ` +
        `Make sure you can participate in all of them.`,
      );
    }

    // Warn if enrolling in multiple doubles events
    if (doublesEvents.length > 1) {
      const eventNames = doublesEvents.map((se) => se.name).join(', ');
      warnings.push(
        `You are enrolling in multiple doubles events: ${eventNames}. ` +
        `Make sure you have different partners or can participate in all.`,
      );
    }

    return warnings;
  }

  /**
   * Validate partner exists and is eligible
   */
  async validatePartner(
    partnerId: string,
    subEventId: string,
  ): Promise<{ valid: boolean; error?: string }> {
    const partner = await Player.findOne({ where: { id: partnerId } });

    if (!partner) {
      return { valid: false, error: 'Partner not found' };
    }

    // Check if partner is already enrolled in this event
    const partnerEnrollment = await TournamentEnrollment.findOne({
      where: {
        tournamentSubEventId: subEventId,
        playerId: partnerId,
        status: Not(In([EnrollmentStatus.CANCELLED, EnrollmentStatus.WITHDRAWN])),
      },
    });

    if (partnerEnrollment) {
      return { valid: false, error: 'Partner is already enrolled in this event' };
    }

    return { valid: true };
  }
}
