import { Field, ObjectType, ID, Int } from '@nestjs/graphql';
import { TournamentEnrollment, TournamentSubEvent } from '@app/models';

@ObjectType()
export class EnrollmentEligibility {
  @Field(() => Boolean)
  eligible!: boolean;

  @Field(() => [String])
  reasons!: string[];

  @Field(() => Boolean)
  hasInvitation!: boolean;

  @Field(() => Boolean)
  meetsLevelRequirement!: boolean;

  @Field(() => Boolean)
  isAlreadyEnrolled!: boolean;

  @Field(() => Boolean)
  hasCapacity!: boolean;

  @Field(() => Boolean)
  isWithinEnrollmentWindow!: boolean;
}

@ObjectType()
export class CartValidationError {
  @Field(() => ID)
  subEventId!: string;

  @Field()
  subEventName!: string;

  @Field()
  errorType!: string;

  @Field()
  message!: string;
}

@ObjectType()
export class CartValidationResult {
  @Field(() => Boolean)
  valid!: boolean;

  @Field(() => [CartValidationError])
  errors!: CartValidationError[];

  @Field(() => [String])
  warnings!: string[];
}

@ObjectType()
export class BulkEnrollmentError {
  @Field(() => ID)
  subEventId!: string;

  @Field()
  subEventName!: string;

  @Field()
  errorMessage!: string;
}

@ObjectType()
export class BulkEnrollmentResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => [TournamentEnrollment])
  enrollments!: TournamentEnrollment[];

  @Field(() => [BulkEnrollmentError])
  errors!: BulkEnrollmentError[];

  @Field(() => Boolean)
  partialSuccess!: boolean;
}

@ObjectType()
export class CapacityInfo {
  @Field(() => Int, { nullable: true })
  maxEntries!: number | null;

  @Field(() => Int)
  currentEnrollmentCount!: number;

  @Field(() => Int)
  confirmedEnrollmentCount!: number;

  @Field(() => Int)
  availableSpots!: number; // -1 for unlimited

  @Field(() => Int)
  waitingListCount!: number;

  @Field(() => Boolean)
  isFull!: boolean;

  @Field(() => Boolean)
  hasWaitingList!: boolean;
}

@ObjectType()
export class SubEventWithEligibility {
  @Field(() => TournamentSubEvent)
  subEvent!: TournamentSubEvent;

  @Field(() => EnrollmentEligibility)
  eligibility!: EnrollmentEligibility;

  @Field(() => CapacityInfo)
  capacity!: CapacityInfo;
}
