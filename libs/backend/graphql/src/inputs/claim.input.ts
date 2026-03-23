import { InputType, PartialType, OmitType } from '@nestjs/graphql';
import { Claim } from '@app/models';

@InputType('ClaimUpdateInput')
export class ClaimUpdateInput extends PartialType(OmitType(Claim, ['createdAt', 'updatedAt'] as const), InputType) {}

@InputType('ClaimNewInput')
export class ClaimNewInput extends PartialType(OmitType(ClaimUpdateInput, ['id'] as const), InputType) {}
