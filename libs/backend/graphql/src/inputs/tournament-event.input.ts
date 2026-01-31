import { Field, InputType, OmitType, PartialType } from '@nestjs/graphql';
import { TournamentEvent } from '@app/models';

@InputType()
export class TournamentEventNewInput extends OmitType(
  TournamentEvent,
  [
    'id',
    'createdAt',
    'updatedAt',
    'tournamentNumber',
    'lastSync',
    'dates',
    'visualCode',
    'slug',
    'usedRankingAmount',
    'usedRankingUnit',
    'state',
    'country',
    'phase',
    'club',
    'tournamentSubEvents',
  ] as const,
  InputType,
) {
  // Override name to be required for new tournaments
  @Field(() => String, { description: 'Name of the tournament' })
  declare name: string;
}

@InputType()
export class TournamentEventUpdateInput extends PartialType(
  OmitType(TournamentEventNewInput, ['clubId'] as const, InputType),
  InputType,
) {}
