import { Field, InputType, PartialType, OmitType } from '@nestjs/graphql';
import { Role, Claim } from '@app/models';
import { Relation } from 'typeorm';
import { ClaimUpdateInput } from './claim.input';

@InputType()
export class RoleUpdateInput extends PartialType(OmitType(Role, ['createdAt', 'updatedAt', 'claims'] as const), InputType) {
  @Field(() => [ClaimUpdateInput], { nullable: true })
  claims?: Relation<Claim[]>;
}

@InputType()
export class RoleNewInput extends PartialType(OmitType(RoleUpdateInput, ['id'] as const), InputType) {}
