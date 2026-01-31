import { Field, ID, InputType, PartialType, OmitType } from '@nestjs/graphql';
import { Game } from '@app/models';

@InputType('StartGameInput')
export class StartGameInput {
  @Field(() => ID, { description: 'Game ID to start' })
  gameId!: string;

  @Field(() => ID, { nullable: true, description: 'Court ID (if not already assigned)' })
  courtId?: string;
}

@InputType()
export class GameUpdateInput extends PartialType(
  OmitType(Game, ['id', 'createdAt', 'updatedAt', 'gamePlayerMemberships', 'rankingPoints', 'tournamentDraw', 'competitionEncounter'] as const),
  InputType,
) {}

@InputType('AssignNextGameInput')
export class AssignNextGameInput {
  @Field(() => ID, { description: 'Court ID to assign next game to' })
  courtId!: string;

  @Field(() => ID, { description: 'Tournament event ID' })
  tournamentEventId!: string;
}
