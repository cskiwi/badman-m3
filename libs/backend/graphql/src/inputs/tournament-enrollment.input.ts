import { Field, ID, InputType } from '@nestjs/graphql';
import { IsUUID, IsOptional, IsString, IsEmail, MaxLength, IsBoolean } from 'class-validator';

@InputType('EnrollPlayerInput', { description: 'Input for enrolling an authenticated player in a tournament sub-event' })
export class EnrollPlayerInput {
  @Field(() => ID, { description: 'Tournament sub-event ID to enroll in' })
  @IsUUID()
  tournamentSubEventId!: string;

  @Field(() => ID, { nullable: true, description: 'Preferred partner player ID (for doubles)' })
  @IsOptional()
  @IsUUID()
  preferredPartnerId?: string;

  @Field(() => String, { nullable: true, description: 'Optional notes for the enrollment' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

@InputType('EnrollGuestInput', { description: 'Input for enrolling a guest (non-registered player) in a tournament sub-event' })
export class EnrollGuestInput {
  @Field(() => ID, { description: 'Tournament sub-event ID to enroll in' })
  @IsUUID()
  tournamentSubEventId!: string;

  @Field(() => String, { description: 'Guest name' })
  @IsString()
  @MaxLength(255)
  guestName!: string;

  @Field(() => String, { description: 'Guest email address' })
  @IsEmail()
  @MaxLength(255)
  guestEmail!: string;

  @Field(() => String, { nullable: true, description: 'Guest phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  guestPhone?: string;

  @Field(() => ID, { nullable: true, description: 'Preferred partner player ID (for doubles)' })
  @IsOptional()
  @IsUUID()
  preferredPartnerId?: string;

  @Field(() => String, { nullable: true, description: 'Optional notes for the enrollment' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

@InputType('UpdateEnrollmentInput', { description: 'Input for updating an enrollment' })
export class UpdateEnrollmentInput {
  @Field(() => ID, { nullable: true, description: 'New preferred partner player ID' })
  @IsOptional()
  @IsUUID()
  preferredPartnerId?: string;

  @Field(() => String, { nullable: true, description: 'Updated notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
