import { Field, InputType, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsEmail, IsUUID, IsString } from 'class-validator';

@InputType('GuestInfoInput')
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

@InputType('CartItemInput')
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


@InputType('AddToCartInput')
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
