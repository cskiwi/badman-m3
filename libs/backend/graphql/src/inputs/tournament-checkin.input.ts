import { Field, ID, InputType } from '@nestjs/graphql';

@InputType('CheckInPlayerInput')
export class CheckInPlayerInput {
  @Field(() => ID, { description: 'Tournament event ID' })
  tournamentEventId!: string;

  @Field(() => ID, { description: 'Enrollment ID to check in' })
  enrollmentId!: string;

  @Field(() => String, { nullable: true, description: 'Optional notes' })
  notes?: string;
}

@InputType('MarkNoShowInput')
export class MarkNoShowInput {
  @Field(() => ID, { description: 'Tournament event ID' })
  tournamentEventId!: string;

  @Field(() => ID, { description: 'Enrollment ID to mark as no-show' })
  enrollmentId!: string;

  @Field(() => String, { nullable: true, description: 'Reason for no-show' })
  reason?: string;
}

@InputType('BulkCheckInInput')
export class BulkCheckInInput {
  @Field(() => ID, { description: 'Tournament event ID' })
  tournamentEventId!: string;

  @Field(() => [ID], { description: 'Enrollment IDs to check in' })
  enrollmentIds!: string[];
}
