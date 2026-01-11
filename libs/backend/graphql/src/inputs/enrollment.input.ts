import { Field, InputType, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsEmail, IsUUID, IsString } from 'class-validator';

@InputType()
export class GuestInfoInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Field()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  phone?: string;
}

@InputType()
export class CartItemInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  subEventId!: string;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  preferredPartnerId?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  notes?: string;

  @Field(() => GuestInfoInput, { nullable: true })
  @IsOptional()
  guestInfo?: GuestInfoInput;
}

@InputType()
export class PartnerPreferenceInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  subEventId!: string;

  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  preferredPartnerId!: string;
}

@InputType()
export class SubEventFilters {
  @Field(() => [String], { nullable: true })
  @IsOptional()
  eventType?: string[]; // M, F, MX

  @Field(() => [String], { nullable: true })
  @IsOptional()
  gameType?: string[]; // S, D, MX

  @Field(() => [Number], { nullable: true })
  @IsOptional()
  level?: number[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  enrollmentStatus?: 'OPEN' | 'AVAILABLE' | 'ALL';

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  searchText?: string;
}

@InputType()
export class BulkEnrollmentInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  tournamentId!: string;

  @Field(() => [ID])
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  subEventIds!: string[];

  @Field(() => [PartnerPreferenceInput], { nullable: true })
  @IsOptional()
  partnerPreferences?: PartnerPreferenceInput[];

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  notes?: string;
}

@InputType()
export class AddToCartInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  tournamentId!: string;

  @Field(() => [CartItemInput])
  @IsNotEmpty()
  items!: CartItemInput[];

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  sessionId?: string;
}
