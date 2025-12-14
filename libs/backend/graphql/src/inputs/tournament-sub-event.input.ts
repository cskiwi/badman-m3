import { InputType, PartialType, OmitType } from '@nestjs/graphql';
import { TournamentSubEvent } from '@app/models';

@InputType()
export class TournamentSubEventUpdateInput extends PartialType(
  OmitType(TournamentSubEvent, ['createdAt', 'updatedAt', 'drawTournaments', 'tournamentEvent'] as const),
  InputType,
) {}

@InputType()
export class TournamentSubEventNewInput extends PartialType(OmitType(TournamentSubEventUpdateInput, ['id'] as const), InputType) {}
