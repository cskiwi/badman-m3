import { InputType, PartialType, OmitType } from '@nestjs/graphql';
import { CompetitionEvent } from '@app/models';

@InputType('CompetitionEventUpdateInput')
export class CompetitionEventUpdateInput extends PartialType(
  OmitType(CompetitionEvent, [
    'id',
    'createdAt',
    'updatedAt',
    'lastSync',
    'slug',
    'visualCode',
    'competitionSubEvents',
    'meta',
    'exceptions',
    'infoEvents',
    'started',
    'contactId',
  ] as const),
  InputType,
) {}

@InputType('CompetitionEventNewInput')
export class CompetitionEventNewInput extends PartialType(
  OmitType(CompetitionEventUpdateInput, [] as const),
  InputType,
) {}
