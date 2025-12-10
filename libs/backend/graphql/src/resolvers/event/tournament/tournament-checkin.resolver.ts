import { PermGuard, User } from '@app/backend-authorization';
import {
  TournamentCheckIn,
  TournamentEvent,
  TournamentEnrollment,
  Player,
  TournamentSubEvent,
} from '@app/models';
import { CheckInStatus, EnrollmentStatus } from '@app/models-enum';
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
  ObjectType,
  Field,
  Parent,
  Query,
  ResolveField,
  Resolver,
  registerEnumType,
} from '@nestjs/graphql';
import { TournamentCheckInArgs } from '../../../args';
import { CheckInPlayerInput, MarkNoShowInput, BulkCheckInInput } from '../../../inputs';
import { In } from 'typeorm';

// Register the CheckInStatus enum for GraphQL
registerEnumType(CheckInStatus, {
  name: 'CheckInStatus',
  description: 'Status of a tournament check-in',
});

// Result types
@ObjectType('CheckInStats')
class CheckInStats {
  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  checkedIn!: number;

  @Field(() => Int)
  pending!: number;

  @Field(() => Int)
  noShow!: number;

  @Field(() => Number)
  checkInRate!: number;
}

@ObjectType('BulkCheckInResult')
class BulkCheckInResult {
  @Field(() => Int)
  successCount!: number;

  @Field(() => Int)
  failedCount!: number;

  @Field(() => [String])
  failedEnrollmentIds!: string[];

  @Field(() => [TournamentCheckIn])
  checkIns!: TournamentCheckIn[];
}

@Resolver(() => TournamentCheckIn)
export class TournamentCheckInResolver {
  // ============ QUERIES ============

  @Query(() => TournamentCheckIn)
  async tournamentCheckIn(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TournamentCheckIn> {
    const checkIn = await TournamentCheckIn.findOne({
      where: { id },
    });

    if (!checkIn) {
      throw new NotFoundException(`Check-in with ID ${id} not found`);
    }

    return checkIn;
  }

  @Query(() => [TournamentCheckIn])
  async tournamentCheckIns(
    @Args('args', { type: () => TournamentCheckInArgs, nullable: true })
    inputArgs?: InstanceType<typeof TournamentCheckInArgs>,
  ): Promise<TournamentCheckIn[]> {
    const args = TournamentCheckInArgs.toFindManyOptions(inputArgs);
    return TournamentCheckIn.find(args);
  }

  @Query(() => [TournamentCheckIn], { description: 'Get all check-ins for a tournament' })
  async tournamentCheckInList(
    @Args('tournamentEventId', { type: () => ID }) tournamentEventId: string,
    @Args('status', { type: () => CheckInStatus, nullable: true }) status?: CheckInStatus,
  ): Promise<TournamentCheckIn[]> {
    const where: any = { tournamentEventId };

    if (status) {
      where.status = status;
    }

    return TournamentCheckIn.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  @Query(() => [TournamentCheckIn], { description: 'Get pending check-ins for a tournament' })
  async pendingCheckIns(
    @Args('tournamentEventId', { type: () => ID }) tournamentEventId: string,
  ): Promise<TournamentCheckIn[]> {
    return TournamentCheckIn.find({
      where: {
        tournamentEventId,
        status: CheckInStatus.PENDING,
      },
      order: { createdAt: 'ASC' },
    });
  }

  @Query(() => CheckInStats, { description: 'Get check-in statistics for a tournament' })
  async checkInStats(
    @Args('tournamentEventId', { type: () => ID }) tournamentEventId: string,
  ): Promise<CheckInStats> {
    const [total, checkedIn, pending, noShow] = await Promise.all([
      TournamentCheckIn.count({ where: { tournamentEventId } }),
      TournamentCheckIn.count({
        where: { tournamentEventId, status: CheckInStatus.CHECKED_IN },
      }),
      TournamentCheckIn.count({
        where: { tournamentEventId, status: CheckInStatus.PENDING },
      }),
      TournamentCheckIn.count({
        where: { tournamentEventId, status: CheckInStatus.NO_SHOW },
      }),
    ]);

    return {
      total,
      checkedIn,
      pending,
      noShow,
      checkInRate: total > 0 ? (checkedIn / total) * 100 : 0,
    };
  }

  @Query(() => TournamentCheckIn, {
    nullable: true,
    description: 'Get check-in status for an enrollment',
  })
  async enrollmentCheckInStatus(
    @Args('tournamentEventId', { type: () => ID }) tournamentEventId: string,
    @Args('enrollmentId', { type: () => ID }) enrollmentId: string,
  ): Promise<TournamentCheckIn | null> {
    return TournamentCheckIn.findOne({
      where: { tournamentEventId, enrollmentId },
    });
  }

  @Query(() => [TournamentEnrollment], {
    description: 'Search enrollments for check-in by player name',
  })
  async searchEnrollmentsForCheckIn(
    @Args('tournamentEventId', { type: () => ID }) tournamentEventId: string,
    @Args('searchTerm', { type: () => String }) searchTerm: string,
  ): Promise<TournamentEnrollment[]> {
    // Get all sub-events for this tournament
    const subEvents = await TournamentSubEvent.find({
      where: { eventId: tournamentEventId },
    });

    if (subEvents.length === 0) {
      return [];
    }

    const subEventIds = subEvents.map((se) => se.id);

    // Find enrollments with confirmed status
    const enrollments = await TournamentEnrollment.find({
      where: {
        tournamentSubEventId: In(subEventIds),
        status: EnrollmentStatus.CONFIRMED,
      },
    });

    // Filter by player name
    const filteredEnrollments: TournamentEnrollment[] = [];
    const searchLower = searchTerm.toLowerCase();

    for (const enrollment of enrollments) {
      if (enrollment.playerId) {
        const player = await Player.findOne({ where: { id: enrollment.playerId } });
        if (
          player &&
          (player.firstName?.toLowerCase().includes(searchLower) ||
            player.lastName?.toLowerCase().includes(searchLower) ||
            player.fullName?.toLowerCase().includes(searchLower))
        ) {
          filteredEnrollments.push(enrollment);
        }
      } else if (enrollment.isGuest && enrollment.guestName) {
        if (enrollment.guestName.toLowerCase().includes(searchLower)) {
          filteredEnrollments.push(enrollment);
        }
      }
    }

    return filteredEnrollments;
  }

  // ============ MUTATIONS ============

  @Mutation(() => TournamentCheckIn, { description: 'Initialize check-in records for a tournament' })
  @UseGuards(PermGuard)
  async initializeCheckIns(
    @User() user: Player,
    @Args('tournamentEventId', { type: () => ID }) tournamentEventId: string,
  ): Promise<TournamentCheckIn[]> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to initialize check-ins');
    }

    // Validate tournament exists
    const tournament = await TournamentEvent.findOne({
      where: { id: tournamentEventId },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentEventId} not found`);
    }

    // Get all sub-events for this tournament
    const subEvents = await TournamentSubEvent.find({
      where: { eventId: tournamentEventId },
    });

    if (subEvents.length === 0) {
      return [];
    }

    const subEventIds = subEvents.map((se) => se.id);

    // Find all confirmed enrollments
    const enrollments = await TournamentEnrollment.find({
      where: {
        tournamentSubEventId: In(subEventIds),
        status: EnrollmentStatus.CONFIRMED,
      },
    });

    const createdCheckIns: TournamentCheckIn[] = [];

    for (const enrollment of enrollments) {
      // Check if check-in already exists
      const existing = await TournamentCheckIn.findOne({
        where: {
          tournamentEventId,
          enrollmentId: enrollment.id,
        },
      });

      if (!existing) {
        const checkIn = new TournamentCheckIn();
        checkIn.tournamentEventId = tournamentEventId;
        checkIn.enrollmentId = enrollment.id;
        checkIn.status = CheckInStatus.PENDING;

        await checkIn.save();
        createdCheckIns.push(checkIn);
      }
    }

    return createdCheckIns;
  }

  @Mutation(() => TournamentCheckIn, { description: 'Check in a player' })
  @UseGuards(PermGuard)
  async checkInPlayer(
    @User() user: Player,
    @Args('input') input: CheckInPlayerInput,
  ): Promise<TournamentCheckIn> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to check in players');
    }

    // Find or create check-in record
    let checkIn = await TournamentCheckIn.findOne({
      where: {
        tournamentEventId: input.tournamentEventId,
        enrollmentId: input.enrollmentId,
      },
    });

    if (!checkIn) {
      // Validate enrollment exists and is confirmed
      const enrollment = await TournamentEnrollment.findOne({
        where: { id: input.enrollmentId },
      });

      if (!enrollment) {
        throw new NotFoundException(`Enrollment with ID ${input.enrollmentId} not found`);
      }

      if (enrollment.status !== EnrollmentStatus.CONFIRMED) {
        throw new BadRequestException('Only confirmed enrollments can be checked in');
      }

      checkIn = new TournamentCheckIn();
      checkIn.tournamentEventId = input.tournamentEventId;
      checkIn.enrollmentId = input.enrollmentId;
    }

    if (checkIn.status === CheckInStatus.CHECKED_IN) {
      throw new BadRequestException('Player is already checked in');
    }

    checkIn.status = CheckInStatus.CHECKED_IN;
    checkIn.checkedInAt = new Date();
    checkIn.checkedInById = user.id;
    checkIn.notes = input.notes;

    await checkIn.save();

    return checkIn;
  }

  @Mutation(() => TournamentCheckIn, { description: 'Mark a player as no-show' })
  @UseGuards(PermGuard)
  async markNoShow(
    @User() user: Player,
    @Args('input') input: MarkNoShowInput,
  ): Promise<TournamentCheckIn> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to mark no-shows');
    }

    // Find or create check-in record
    let checkIn = await TournamentCheckIn.findOne({
      where: {
        tournamentEventId: input.tournamentEventId,
        enrollmentId: input.enrollmentId,
      },
    });

    if (!checkIn) {
      checkIn = new TournamentCheckIn();
      checkIn.tournamentEventId = input.tournamentEventId;
      checkIn.enrollmentId = input.enrollmentId;
    }

    checkIn.status = CheckInStatus.NO_SHOW;
    checkIn.notes = input.reason;
    checkIn.checkedInById = user.id;

    await checkIn.save();

    return checkIn;
  }

  @Mutation(() => TournamentCheckIn, { description: 'Undo a check-in (set back to pending)' })
  @UseGuards(PermGuard)
  async undoCheckIn(
    @User() user: Player,
    @Args('checkInId', { type: () => ID }) checkInId: string,
  ): Promise<TournamentCheckIn> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to undo check-ins');
    }

    const checkIn = await TournamentCheckIn.findOne({
      where: { id: checkInId },
    });

    if (!checkIn) {
      throw new NotFoundException(`Check-in with ID ${checkInId} not found`);
    }

    checkIn.status = CheckInStatus.PENDING;
    checkIn.checkedInAt = undefined;
    checkIn.checkedInById = undefined;
    checkIn.notes = undefined;

    await checkIn.save();

    return checkIn;
  }

  @Mutation(() => BulkCheckInResult, { description: 'Check in multiple players at once' })
  @UseGuards(PermGuard)
  async bulkCheckIn(
    @User() user: Player,
    @Args('input') input: BulkCheckInInput,
  ): Promise<BulkCheckInResult> {
    // Check permission
    if (!user.hasAnyPermission(['edit-any:tournament'])) {
      throw new ForbiddenException('You do not have permission to check in players');
    }

    const result: BulkCheckInResult = {
      successCount: 0,
      failedCount: 0,
      failedEnrollmentIds: [],
      checkIns: [],
    };

    for (const enrollmentId of input.enrollmentIds) {
      try {
        // Find or create check-in record
        let checkIn = await TournamentCheckIn.findOne({
          where: {
            tournamentEventId: input.tournamentEventId,
            enrollmentId,
          },
        });

        if (!checkIn) {
          checkIn = new TournamentCheckIn();
          checkIn.tournamentEventId = input.tournamentEventId;
          checkIn.enrollmentId = enrollmentId;
        }

        if (checkIn.status !== CheckInStatus.CHECKED_IN) {
          checkIn.status = CheckInStatus.CHECKED_IN;
          checkIn.checkedInAt = new Date();
          checkIn.checkedInById = user.id;

          await checkIn.save();
        }

        result.checkIns.push(checkIn);
        result.successCount++;
      } catch {
        result.failedCount++;
        result.failedEnrollmentIds.push(enrollmentId);
      }
    }

    return result;
  }

  // ============ RESOLVE FIELDS ============

  @ResolveField(() => TournamentEvent, { nullable: true })
  async tournamentEvent(
    @Parent() { tournamentEventId }: TournamentCheckIn,
  ): Promise<TournamentEvent | null> {
    if (!tournamentEventId) return null;
    return TournamentEvent.findOne({ where: { id: tournamentEventId } });
  }

  @ResolveField(() => TournamentEnrollment, { nullable: true })
  async enrollment(
    @Parent() { enrollmentId }: TournamentCheckIn,
  ): Promise<TournamentEnrollment | null> {
    if (!enrollmentId) return null;
    return TournamentEnrollment.findOne({ where: { id: enrollmentId } });
  }

  @ResolveField(() => Player, { nullable: true })
  async checkedInBy(
    @Parent() { checkedInById }: TournamentCheckIn,
  ): Promise<Player | null> {
    if (!checkedInById) return null;
    return Player.findOne({ where: { id: checkedInById } });
  }

  @ResolveField(() => Player, { nullable: true, description: 'The player being checked in' })
  async player(@Parent() { enrollmentId }: TournamentCheckIn): Promise<Player | null> {
    if (!enrollmentId) return null;

    const enrollment = await TournamentEnrollment.findOne({
      where: { id: enrollmentId },
    });

    if (!enrollment || !enrollment.playerId) return null;

    return Player.findOne({ where: { id: enrollment.playerId } });
  }
}
