import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { TournamentSubEvent, TournamentEnrollment } from '@app/models';
import { EnrollmentStatus } from '@app/models-enum';

export interface CapacityInfo {
  maxEntries: number | null;
  currentEnrollmentCount: number;
  confirmedEnrollmentCount: number;
  availableSpots: number;
  waitingListCount: number;
  isFull: boolean;
  hasWaitingList: boolean;
}

@Injectable()
export class EnrollmentCapacityService {
  /**
   * Get capacity information for a single sub-event
   */
  async getCapacity(subEventId: string): Promise<CapacityInfo> {
    const subEvent = await TournamentSubEvent.findOne({
      where: { id: subEventId },
    });

    if (!subEvent) {
      throw new Error('Sub-event not found');
    }

    const waitingListCount = await TournamentEnrollment.count({
      where: {
        tournamentSubEventId: subEventId,
        status: EnrollmentStatus.WAITING_LIST,
      },
    });

    const availableSpots = subEvent.maxEntries
      ? Math.max(0, subEvent.maxEntries - subEvent.currentEnrollmentCount)
      : Infinity;

    return {
      maxEntries: subEvent.maxEntries || null,
      currentEnrollmentCount: subEvent.currentEnrollmentCount,
      confirmedEnrollmentCount: subEvent.confirmedEnrollmentCount,
      availableSpots: availableSpots === Infinity ? -1 : availableSpots,
      waitingListCount,
      isFull: subEvent.maxEntries
        ? subEvent.currentEnrollmentCount >= subEvent.maxEntries
        : false,
      hasWaitingList: subEvent.waitingListEnabled,
    };
  }

  /**
   * Get capacity information for multiple sub-events (batched)
   */
  async getCapacitiesForSubEvents(
    subEventIds: string[],
  ): Promise<Map<string, CapacityInfo>> {
    // Return empty map if no IDs provided
    if (!subEventIds || subEventIds.length === 0) {
      return new Map();
    }

    const subEvents = await TournamentSubEvent.find({
      where: { id: In(subEventIds) },
    });

    const waitingListCounts = await TournamentEnrollment
      .createQueryBuilder('e')
      .select('e.tournamentSubEventId', 'subEventId')
      .addSelect('COUNT(*)', 'count')
      .where('e.tournamentSubEventId IN (:...ids)', { ids: subEventIds })
      .andWhere('e.status = :status', { status: EnrollmentStatus.WAITING_LIST })
      .groupBy('e.tournamentSubEventId')
      .getRawMany<{ subEventId: string; count: string }>();

    const waitingListMap = new Map<string, number>(
      waitingListCounts.map((r) => [r.subEventId, parseInt(r.count, 10)]),
    );

    const capacityMap = new Map<string, CapacityInfo>();

    subEvents.forEach((subEvent) => {
      const waitingListCount = waitingListMap.get(subEvent.id) || 0;
      const availableSpots = subEvent.maxEntries
        ? Math.max(0, subEvent.maxEntries - subEvent.currentEnrollmentCount)
        : Infinity;

      capacityMap.set(subEvent.id, {
        maxEntries: subEvent.maxEntries || null,
        currentEnrollmentCount: subEvent.currentEnrollmentCount,
        confirmedEnrollmentCount: subEvent.confirmedEnrollmentCount,
        availableSpots: availableSpots === Infinity ? -1 : availableSpots,
        waitingListCount,
        isFull: subEvent.maxEntries
          ? subEvent.currentEnrollmentCount >= subEvent.maxEntries
          : false,
        hasWaitingList: subEvent.waitingListEnabled,
      });
    });

    return capacityMap;
  }

  /**
   * Check if enrollment should go to waiting list
   */
  async shouldEnrollToWaitingList(subEventId: string): Promise<boolean> {
    const capacity = await this.getCapacity(subEventId);
    return capacity.isFull && capacity.hasWaitingList;
  }

  /**
   * Get next waiting list position
   */
  async getNextWaitingListPosition(subEventId: string): Promise<number> {
    const result = await TournamentEnrollment
      .createQueryBuilder('e')
      .select('MAX(e.waitingListPosition)', 'max')
      .where('e.tournamentSubEventId = :subEventId', { subEventId })
      .andWhere('e.status = :status', { status: EnrollmentStatus.WAITING_LIST })
      .getRawOne<{ max: number | null }>();

    return (result?.max || 0) + 1;
  }

  /**
   * Get enrollments on waiting list for a sub-event
   */
  async getWaitingList(
    subEventId: string,
  ): Promise<TournamentEnrollment[]> {
    return TournamentEnrollment.find({
      where: {
        tournamentSubEventId: subEventId,
        status: EnrollmentStatus.WAITING_LIST,
      },
      order: { waitingListPosition: 'ASC' },
      relations: ['player'],
    });
  }

  /**
   * Auto-promote from waiting list
   * This is called when a spot opens up (enrollment cancelled)
   */
  async promoteFromWaitingList(
    subEventId: string,
  ): Promise<TournamentEnrollment | null> {
    const subEvent = await TournamentSubEvent.findOne({
      where: { id: subEventId },
    });

    if (!subEvent || !subEvent.autoPromoteFromWaitingList) {
      return null;
    }

    // Check if there's capacity
    const capacity = await this.getCapacity(subEventId);
    if (capacity.availableSpots <= 0) {
      return null;
    }

    // Get next person on waiting list
    const nextInLine = await TournamentEnrollment.findOne({
      where: {
        tournamentSubEventId: subEventId,
        status: EnrollmentStatus.WAITING_LIST,
      },
      order: { waitingListPosition: 'ASC' },
    });

    if (!nextInLine) {
      return null;
    }

    // Promote them
    nextInLine.status = EnrollmentStatus.CONFIRMED;
    nextInLine.promotedFromWaitingList = true;
    nextInLine.promotedAt = new Date();
    nextInLine.originalWaitingListPosition = nextInLine.waitingListPosition;
    nextInLine.waitingListPosition = undefined;
    nextInLine.enrollmentSource = 'AUTO_PROMOTED';

    await TournamentEnrollment.save(nextInLine);

    // Note: Database trigger will handle waiting list position updates
    // and logging to WaitingListLogs table

    return nextInLine;
  }
}
