import { Field, ID, InputType, Int, OmitType, PartialType, PickType } from '@nestjs/graphql';
import { TournamentSubEvent } from '@app/models';

@InputType('CreateTournamentSubEventInput')
export class CreateTournamentSubEventInput extends PickType(
  TournamentSubEvent,
  ['name', 'gameType', 'level', 'maxEntries', 'waitingListEnabled'] as const,
  InputType,
) {
  @Field(() => ID, { description: 'Tournament event ID' })
  tournamentEventId!: string;
}

@InputType('UpdateTournamentSubEventInput')
export class UpdateTournamentSubEventInput extends PartialType(
  PickType(TournamentSubEvent, ['name', 'level', 'maxEntries', 'waitingListEnabled'] as const, InputType),
  InputType,
) {}
