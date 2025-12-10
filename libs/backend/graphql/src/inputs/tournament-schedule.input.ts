import { Field, ID, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { ScheduleStrategy } from '@app/models-enum';

// Register the ScheduleStrategy enum for GraphQL
registerEnumType(ScheduleStrategy, {
  name: 'ScheduleStrategy',
  description: 'Strategy for scheduling tournament games',
});

@InputType('GenerateTimeSlotsInput')
export class GenerateTimeSlotsInput {
  @Field(() => ID, { description: 'Tournament event ID' })
  tournamentEventId!: string;

  @Field(() => [ID], { description: 'Court IDs to create slots for' })
  courtIds!: string[];

  @Field(() => [Date], { description: 'Dates for which to create slots' })
  dates!: Date[];

  @Field(() => String, {
    description: 'Start time for slots (HH:MM format)',
    defaultValue: '09:00',
  })
  startTime!: string;

  @Field(() => String, {
    description: 'End time for slots (HH:MM format)',
    defaultValue: '18:00',
  })
  endTime!: string;

  @Field(() => Int, {
    description: 'Duration of each slot in minutes',
    defaultValue: 30,
  })
  slotDurationMinutes!: number;

  @Field(() => Int, {
    description: 'Break between slots in minutes',
    defaultValue: 0,
  })
  breakMinutes!: number;
}

@InputType('ScheduleGamesInput')
export class ScheduleGamesInput {
  @Field(() => ID, { description: 'Tournament event ID' })
  tournamentEventId!: string;

  @Field(() => ScheduleStrategy, {
    description: 'Scheduling strategy to use',
    defaultValue: ScheduleStrategy.MINIMIZE_WAIT,
  })
  strategy!: ScheduleStrategy;

  @Field(() => [ID], {
    nullable: true,
    description: 'Specific draw IDs to schedule (if empty, schedules all unscheduled games)',
  })
  drawIds?: string[];

  @Field(() => Int, {
    nullable: true,
    description: 'Minimum rest time between games for same player (minutes)',
    defaultValue: 15,
  })
  minRestMinutes?: number;
}

@InputType('AssignGameToSlotInput')
export class AssignGameToSlotInput {
  @Field(() => ID, { description: 'Game ID to schedule' })
  gameId!: string;

  @Field(() => ID, { description: 'Schedule slot ID to assign' })
  slotId!: string;
}

@InputType('UpdateScheduleSlotInput')
export class UpdateScheduleSlotInput {
  @Field(() => Date, { nullable: true, description: 'New start time' })
  startTime?: Date;

  @Field(() => Date, { nullable: true, description: 'New end time' })
  endTime?: Date;

  @Field(() => ID, { nullable: true, description: 'New court ID' })
  courtId?: string;
}

@InputType('BlockSlotInput')
export class BlockSlotInput {
  @Field(() => ID, { description: 'Slot ID to block' })
  slotId!: string;

  @Field(() => String, { nullable: true, description: 'Reason for blocking' })
  reason?: string;
}

@InputType('CreateScheduleSlotInput')
export class CreateScheduleSlotInput {
  @Field(() => ID, { description: 'Tournament event ID' })
  tournamentEventId!: string;

  @Field(() => ID, { description: 'Court ID' })
  courtId!: string;

  @Field(() => Date, { description: 'Start time' })
  startTime!: Date;

  @Field(() => Date, { description: 'End time' })
  endTime!: Date;
}
