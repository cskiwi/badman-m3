import { InputType, PartialType, OmitType } from '@nestjs/graphql';
import { Player } from '@app/models';

@InputType()
export class PlayerUpdateInput extends PartialType(
  OmitType(Player, [
    'createdAt',
    'updatedAt',
    'permissions',
    'rankingLastPlaces',
    'rankingPlaces',
    'rankingPoints',
    'clubPlayerMemberships',
    'teamPlayerMemberships',
    'gamePlayerMemberships',
    'roles',
    'claims',
  ] as const),
  InputType,
) {}

@InputType()
export class PlayerNewInput extends PartialType(OmitType(PlayerUpdateInput, ['id'] as const), InputType) {}
