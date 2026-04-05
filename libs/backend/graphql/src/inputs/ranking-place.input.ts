import { InputType, OmitType, PartialType } from '@nestjs/graphql';
import { RankingPlace } from '@app/models';

@InputType('RankingPlaceUpdateInput')
export class RankingPlaceUpdateInput extends PartialType(
  OmitType(RankingPlace, ['createdAt', 'updatedAt', 'player', 'system', 'group'] as const),
  InputType,
) {}

@InputType('RankingPlaceNewInput')
export class RankingPlaceNewInput extends PartialType(OmitType(RankingPlaceUpdateInput, ['id'] as const), InputType) {}
