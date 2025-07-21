import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsEmail, IsBoolean, IsIn, IsDateString } from 'class-validator';

@InputType()
export class UpdatePlayerInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['M', 'F'])
  gender?: 'M' | 'F';

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  birthDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  competitionPlayer?: boolean;
}