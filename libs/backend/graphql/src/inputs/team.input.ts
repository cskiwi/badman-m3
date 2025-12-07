import { InputType, PartialType, OmitType } from '@nestjs/graphql';
import { Team } from '@app/models';

@InputType()
export class TeamUpdateInput extends PartialType(
  OmitType(Team, ['createdAt', 'updatedAt', 'captain', 'teamPlayerMemberships', 'club', 'entries'] as const),
  InputType,
) {}

@InputType()
export class TeamNewInput extends PartialType(OmitType(TeamUpdateInput, ['id'] as const), InputType) {}
